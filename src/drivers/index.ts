import os from "os";
import { UnsupportedPlatformError } from "../errors";
import { PrintDriver } from "./driver";
import cupsDriver from "./cups/cups-driver";
import windowsDriver from "./windows/windows-driver";

/**
 * Platform-to-backend registry. Adding a platform is an entry here plus an
 * implementation of PrintDriver.
 */
const drivers: Partial<Record<NodeJS.Platform, PrintDriver>> = {
  win32: windowsDriver,
  darwin: cupsDriver,
  linux: cupsDriver,
  freebsd: cupsDriver,
  openbsd: cupsDriver,
  sunos: cupsDriver,
};

export const SUPPORTED_PLATFORMS = Object.keys(drivers);

/**
 * Selects the backend for the current platform.
 *
 * Resolved per call rather than at module load, so importing this library on
 * an unsupported platform never throws at require time.
 *
 * @throws {UnsupportedPlatformError} If no backend covers the platform.
 */
export default function resolveDriver(
  platform: NodeJS.Platform = os.platform(),
): PrintDriver {
  const driver = drivers[platform];

  if (!driver) {
    throw new UnsupportedPlatformError(platform, SUPPORTED_PLATFORMS);
  }

  return driver;
}
