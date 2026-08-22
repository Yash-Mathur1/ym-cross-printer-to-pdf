import fs from "fs";
import resolveDriver from "../drivers";
import assertSupported from "../drivers/assert-supported";
import normalize from "../options/normalize";
import { PrintOptions } from "../options/types";
import { FileNotFoundError } from "../errors";

export { PrintOptions };

/**
 * Prints a PDF file to a printer
 *
 * @param pdf - Path to the PDF file to print
 * @param options - Printing configuration options
 * @returns Promise that resolves when printing is complete
 * @throws {FileNotFoundError} If the PDF file doesn't exist
 * @throws {InvalidOptionError} If an option value is outside its allowed set
 * @throws {UnsupportedOptionError} If the platform cannot honour an option
 * @throws {UnsupportedPlatformError} If the platform has no printing backend
 *
 * @example
 * ```typescript
 * // Print to default printer
 * await print("document.pdf");
 *
 * // Print to specific printer with options
 * await print("document.pdf", {
 *   printer: "HP LaserJet",
 *   pages: "1-3",
 *   copies: 2,
 *   paperSize: "A4"
 * });
 * ```
 */
export default async function print(
  pdf: string,
  options: PrintOptions = {},
): Promise<void> {
  const driver = resolveDriver();

  if (!pdf) throw new FileNotFoundError("No PDF specified");
  if (!fs.existsSync(pdf)) throw new FileNotFoundError("No such file");

  const normalized = normalize(options);

  assertSupported(driver, normalized);

  await driver.print(pdf, normalized);
}
