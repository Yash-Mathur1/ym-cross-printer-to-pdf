import fs from "fs";
import os from "os";
import execFileAsync, {
  ExecFileAsyncOptions,
  ExecFileAsyncResult,
} from "../../utils/exec-file-async";
import { MissingDependencyError } from "../../errors";

/** A query that has not answered by now is wedged. */
export const QUERY_TIMEOUT_MS = 15_000;

/**
 * CUPS translates its human-readable output, so a German host reports
 * "Standardziel des Systems:" where a parser expects "system default
 * destination:". Pinning the locale is what makes these parsers work abroad.
 */
const C_LOCALE = { LC_ALL: "C", LANG: "C", LANGUAGE: "C" } as const;

function isNotFound(error: unknown): boolean {
  return (error as NodeJS.ErrnoException)?.code === "ENOENT";
}

/**
 * WSL reports itself as linux, so the CUPS driver engages and then fails at the
 * spawn. Suggesting a package install there would be misleading.
 */
function isWsl(): boolean {
  if (os.platform() !== "linux") return false;

  try {
    return /microsoft/i.test(fs.readFileSync("/proc/version", "utf8"));
  } catch {
    return false;
  }
}

function installHint(): string {
  if (isWsl()) {
    return (
      "WSL has no print stack by default; printing must be handled on the " +
      "Windows host, or CUPS installed and configured inside the distribution."
    );
  }

  if (os.platform() === "darwin") {
    return "CUPS ships with macOS, so a missing command suggests a damaged PATH.";
  }

  return (
    "Install the CUPS client tools: `sudo apt install cups-client` on " +
    "Debian/Ubuntu, or `sudo dnf install cups-client` on Fedora/RHEL."
  );
}

/**
 * Runs a CUPS command with the locale pinned.
 *
 * @throws {MissingDependencyError} If the command is not installed.
 */
export default async function runCups(
  binary: string,
  args: string[],
  options: ExecFileAsyncOptions = {},
): Promise<ExecFileAsyncResult> {
  try {
    return await execFileAsync(binary, args, {
      ...options,
      env: { ...process.env, ...C_LOCALE },
    });
  } catch (error) {
    if (isNotFound(error))
      throw new MissingDependencyError(binary, installHint());
    throw error;
  }
}

/**
 * Runs a CUPS query, tolerating failure.
 *
 * Discovery must not collapse because one queue went away mid-enumeration, so
 * a non-zero exit yields empty output instead of rejecting. A missing binary
 * still propagates: that is a configuration problem, not a transient one.
 */
export async function runCupsQuery(
  binary: string,
  args: string[],
): Promise<string> {
  try {
    const { stdout } = await runCups(binary, args, {
      timeout: QUERY_TIMEOUT_MS,
    });
    return stdout;
  } catch (error) {
    if (error instanceof MissingDependencyError) throw error;
    return "";
  }
}
