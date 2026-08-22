import path from "path";
import { NormalizedOptions, Side } from "../../options/types";

/**
 * IPP orientation-requested values. 3 is portrait, 4 is landscape; 5 and 6 are
 * the reversed variants this library does not model.
 */
const ORIENTATION: Record<string, string> = {
  portrait: "3",
  landscape: "4",
};

/**
 * SumatraPDF's bare "duplex" means long-edge, which is also what CUPS treats as
 * the conventional two-sided default.
 */
const SIDES: Record<Side, string> = {
  duplex: "two-sided-long-edge",
  duplexlong: "two-sided-long-edge",
  duplexshort: "two-sided-short-edge",
  simplex: "one-sided",
};

/**
 * Builds argv for `lp`.
 *
 * Values are already validated by `normalize`; this maps only.
 */
export default function buildLpArgs(
  pdf: string,
  options: NormalizedOptions,
): string[] {
  const args: string[] = [];

  if (options.printer) args.push("-d", options.printer);
  if (options.copies) args.push("-n", String(options.copies));

  for (const option of buildPrintOptions(options)) {
    args.push("-o", option);
  }

  // lp has no "--" terminator, so a relative name beginning with a dash would
  // be read as a flag. An absolute path never can be.
  args.push(path.resolve(pdf));

  return args;
}

function buildPrintOptions(options: NormalizedOptions): string[] {
  const printOptions: string[] = [];

  if (options.pages) printOptions.push(`page-ranges=${options.pages}`);
  if (options.subset) printOptions.push(`page-set=${options.subset}`);

  if (options.orientation) {
    printOptions.push(
      `orientation-requested=${ORIENTATION[options.orientation]}`,
    );
  }

  if (options.monochrome === true) {
    printOptions.push("print-color-mode=monochrome");
  } else if (options.monochrome === false) {
    printOptions.push("print-color-mode=color");
  }

  if (options.side) printOptions.push(`sides=${SIDES[options.side]}`);
  if (options.paperSize) printOptions.push(`media=${options.paperSize}`);

  // CUPS has no one-way shrink: fit-to-page also enlarges undersized pages.
  // "shrink" is therefore approximated, which the capability table records.
  if (options.scale === "fit" || options.scale === "shrink") {
    printOptions.push("fit-to-page");
  } else if (options.scale === "noscale") {
    printOptions.push("scaling=100");
  }

  // Tray identifiers are PPD-specific and share no namespace with Windows bin
  // numbers, so the value is passed through verbatim.
  if (options.bin) printOptions.push(`InputSlot=${options.bin}`);

  return printOptions;
}

/**
 * Extracts the job id from `lp`'s acknowledgement:
 *
 *     request id is HP_LaserJet-42 (1 file(s))
 */
export function parseJobId(stdout: string): string | undefined {
  return stdout.match(/request id is (\S+)/)?.[1];
}
