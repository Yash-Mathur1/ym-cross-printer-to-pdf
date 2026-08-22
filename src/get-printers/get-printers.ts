import resolveDriver from "../drivers";
import { Printer } from "../types";

/**
 * Gets a list of all available printers on the system
 *
 * @returns Promise that resolves to an array of printer objects
 * @throws {UnsupportedPlatformError} If the platform has no printing backend
 *
 * @example
 * ```typescript
 * const printers = await getPrinters();
 * console.log(printers);
 * // [
 * //   { deviceId: "HP_LaserJet", name: "HP LaserJet Pro", paperSizes: ["A4", "Letter"] },
 * //   { deviceId: "Canon_Pixma", name: "Canon PIXMA", paperSizes: ["A4", "A3"] }
 * // ]
 * ```
 */
export default async function getPrinters(): Promise<Printer[]> {
  return resolveDriver().getPrinters();
}
