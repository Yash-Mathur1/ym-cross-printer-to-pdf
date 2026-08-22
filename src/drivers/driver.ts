import { NormalizedOptions, PrintOptionName } from "../options/types";
import { Printer } from "../types";

/**
 * How completely a backend honours an option.
 *
 * "partial" means the backend does something reasonable but not identical to
 * the other platforms; it is documented rather than thrown.
 */
export type Capability = "full" | "partial" | "none";

export type CapabilityTable = Readonly<Record<PrintOptionName, Capability>>;

export type DriverId = "windows" | "cups";

/**
 * The contract every platform backend satisfies. Adding a platform means
 * adding an implementation of this and registering it, nothing else.
 */
export interface PrintDriver {
  readonly id: DriverId;
  /** Drives both runtime support checks and the generated support matrix. */
  readonly capabilities: CapabilityTable;
  print(pdf: string, options: NormalizedOptions): Promise<void>;
  getPrinters(): Promise<Printer[]>;
  getDefaultPrinter(): Promise<Printer | null>;
}
