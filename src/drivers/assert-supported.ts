import { UnsupportedOptionError } from "../errors";
import { NormalizedOptions } from "../options/types";
import { PrintDriver } from "./driver";

/** Prefix for diagnostics, so warnings are attributable in a busy log. */
const PACKAGE_NAME = "@ym1/cross-printer-to-pdf";

/**
 * Fails a print before it starts when the caller asked for something the
 * active backend cannot do.
 *
 * Silently dropping an option is worse than failing: a label printed without
 * its requested `paperSize` consumes stock and looks like a success.
 *
 * @throws {UnsupportedOptionError} When strict (the default) and an option is
 * unsupported.
 */
export default function assertSupported(
  driver: PrintDriver,
  options: NormalizedOptions,
): void {
  const unsupported = options.provided.filter(
    (name) => driver.capabilities[name] === "none",
  );

  if (!unsupported.length) return;

  if (options.strict) {
    throw new UnsupportedOptionError(unsupported[0], driver.id);
  }

  for (const option of unsupported) {
    console.warn(
      `[${PACKAGE_NAME}] Ignoring option "${option}": ` +
        `not supported by the ${driver.id} printing backend.`,
    );
  }
}
