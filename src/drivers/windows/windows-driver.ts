import execFileAsync from "../../utils/exec-file-async";
import { NormalizedOptions } from "../../options/types";
import { Printer } from "../../types";
import { CapabilityTable, PrintDriver } from "../driver";
import {
  DEFAULT_PRINTER_QUERY,
  PRINTERS_QUERY,
  toPrinters,
} from "./cim-printer";
import runPowerShellJson from "./powershell";
import wrapPrintFailure from "../print-failure";
import buildSumatraArgs from "./sumatra-args";
import resolveSumatraPath from "./sumatra-path";

/**
 * SumatraPDF exposes every option this library models, so nothing here is
 * approximated or dropped.
 */
const capabilities: CapabilityTable = {
  printer: "full",
  pages: "full",
  subset: "full",
  orientation: "full",
  scale: "full",
  monochrome: "full",
  side: "full",
  bin: "full",
  paperSize: "full",
  paperKind: "full",
  silent: "full",
  printDialog: "full",
  copies: "full",
};

const windowsDriver: PrintDriver = {
  id: "windows",

  capabilities,

  async print(pdf: string, options: NormalizedOptions): Promise<void> {
    const sumatraPdf = resolveSumatraPath(options.win32.sumatraPdfPath);

    try {
      await execFileAsync(sumatraPdf, buildSumatraArgs(pdf, options));
    } catch (error) {
      wrapPrintFailure(error);
    }
  },

  async getPrinters(): Promise<Printer[]> {
    return toPrinters(await runPowerShellJson<unknown>(PRINTERS_QUERY));
  },

  async getDefaultPrinter(): Promise<Printer | null> {
    const [printer] = toPrinters(
      await runPowerShellJson<unknown>(DEFAULT_PRINTER_QUERY),
    );

    return printer ?? null;
  },
};

export default windowsDriver;
