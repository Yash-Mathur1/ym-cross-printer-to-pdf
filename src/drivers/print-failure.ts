import { PdfToPrinterError, PrintError } from "../errors";

/**
 * Normalizes a backend spawn failure into a PrintError.
 *
 * Both drivers funnel through this so a failed job looks the same on every
 * platform: same class, same code, backend diagnostics in `stderr`.
 */
export default function wrapPrintFailure(error: unknown): never {
  // Our own errors are already meaningful; re-wrapping would bury the reason.
  if (error instanceof PdfToPrinterError) throw error;

  const details = error as { code?: unknown; stderr?: unknown };

  throw new PrintError(`Printing failed: ${describe(error)}`, {
    cause: error,
    exitCode: typeof details?.code === "number" ? details.code : undefined,
    stderr: typeof details?.stderr === "string" ? details.stderr : undefined,
  });
}

function describe(error: unknown): string {
  const stderr = (error as { stderr?: unknown })?.stderr;

  if (typeof stderr === "string" && stderr.trim()) return stderr.trim();
  if (error instanceof Error) return error.message;

  return String(error);
}
