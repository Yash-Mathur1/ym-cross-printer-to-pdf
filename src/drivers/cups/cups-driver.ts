import { NormalizedOptions } from "../../options/types";
import { Printer } from "../../types";
import { CapabilityTable, PrintDriver } from "../driver";
import wrapPrintFailure from "../print-failure";
import runCups, { runCupsQuery } from "./cups-exec";
import buildLpArgs from "./lp-args";
import {
  parseDefaultDestination,
  parseDescriptions,
  parsePageSizes,
  parseQueueNames,
} from "./parse-lpoptions";

/**
 * Media lists cost one `lpoptions` call per queue. A small pool keeps a host
 * with many printers from spawning dozens of processes at once.
 */
const LOOKUP_CONCURRENCY = 4;

const capabilities: CapabilityTable = {
  printer: "full",
  pages: "full",
  subset: "full",
  orientation: "full",
  monochrome: "full",
  side: "full",
  paperSize: "full",
  copies: "full",
  // fit-to-page also enlarges, so "shrink" is not an exact match.
  scale: "partial",
  // PPD InputSlot keywords, not Windows tray numbers.
  bin: "partial",
  // lp never prompts, so silent:true is honoured and silent:false cannot be.
  silent: "partial",
  paperKind: "none",
  printDialog: "none",
};

const cupsDriver: PrintDriver = {
  id: "cups",

  capabilities,

  async print(pdf: string, options: NormalizedOptions): Promise<void> {
    const args = buildLpArgs(pdf, options);

    try {
      await runCups("lp", args);
    } catch (error) {
      wrapPrintFailure(error);
    }
  },

  async getPrinters(): Promise<Printer[]> {
    const [names, descriptions] = await Promise.all([
      runCupsQuery("lpstat", ["-e"]).then(parseQueueNames),
      runCupsQuery("lpstat", ["-l", "-p"]).then(parseDescriptions),
    ]);

    const paperSizes = await mapWithLimit(
      names,
      LOOKUP_CONCURRENCY,
      readPageSizes,
    );

    return names.map((name, index) => ({
      deviceId: name,
      name: descriptions.get(name) || name,
      paperSizes: paperSizes[index],
    }));
  },

  async getDefaultPrinter(): Promise<Printer | null> {
    const name = await resolveDefaultName();

    if (!name) return null;

    // LPDEST can name a queue that no longer exists; reporting it as a printer
    // would hand the caller a name that fails at print time.
    const names = parseQueueNames(await runCupsQuery("lpstat", ["-e"]));

    if (!names.includes(name)) return null;

    const [descriptions, paperSizes] = await Promise.all([
      runCupsQuery("lpstat", ["-l", "-p", name]).then(parseDescriptions),
      readPageSizes(name),
    ]);

    return { deviceId: name, name: descriptions.get(name) || name, paperSizes };
  },
};

/**
 * CUPS resolves the default destination from LPDEST, then PRINTER, then its own
 * configuration. Honouring that order keeps this library consistent with `lp`
 * run from the same shell.
 */
async function resolveDefaultName(): Promise<string | null> {
  const fromEnv = process.env.LPDEST || process.env.PRINTER;

  if (fromEnv) return fromEnv;

  return parseDefaultDestination(await runCupsQuery("lpstat", ["-d"]));
}

async function readPageSizes(name: string): Promise<string[]> {
  return parsePageSizes(await runCupsQuery("lpoptions", ["-p", name, "-l"]));
}

/**
 * Bounded-concurrency map, preserving input order.
 *
 * Hand-rolled because this package ships with no runtime dependencies.
 */
export async function mapWithLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );

  return results;
}

export default cupsDriver;
