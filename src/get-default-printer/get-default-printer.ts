import resolveDriver from "../drivers";
import { Printer } from "../types";

/**
 * Gets the default printer information
 *
 * @returns Promise that resolves to the default printer object, or null if no default printer is set
 * @throws {UnsupportedPlatformError} If the platform has no printing backend
 *
 * @example
 * ```typescript
 * const defaultPrinter = await getDefaultPrinter();
 * if (defaultPrinter) {
 *   console.log(`Default printer: ${defaultPrinter.name}`);
 * } else {
 *   console.log("No default printer set");
 * }
 * ```
 */
export default async function getDefaultPrinter(): Promise<Printer | null> {
  return resolveDriver().getDefaultPrinter();
}
