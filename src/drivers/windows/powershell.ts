import path from "path";
import execFileAsync from "../../utils/exec-file-async";

/**
 * A CIM query that has not answered within this window is not going to.
 * Without it a wedged WMI provider hangs the caller indefinitely.
 */
const QUERY_TIMEOUT_MS = 30_000;

/**
 * Emit UTF-8 without a BOM so printer names outside the OEM code page survive
 * the pipe, and silence the progress stream so it cannot interleave with the
 * JSON we are about to parse.
 */
const PREAMBLE =
  "$ProgressPreference='SilentlyContinue';" +
  "$ErrorActionPreference='Stop';" +
  "[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding $false;";

/**
 * Resolves the interpreter by absolute path rather than trusting PATH, where a
 * shadowing `powershell.exe` would otherwise be picked up.
 */
export function resolvePowerShellPath(): string {
  const systemRoot = process.env.SystemRoot || process.env.SYSTEMROOT;

  if (!systemRoot) return "powershell.exe";

  return path.join(
    systemRoot,
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
}

/**
 * `-EncodedCommand` takes base64 of UTF-16LE, which sidesteps every quoting and
 * escaping question the command line would otherwise raise.
 */
export function encodeCommand(script: string): string {
  return Buffer.from(script, "utf16le").toString("base64");
}

/**
 * Runs a PowerShell snippet that writes JSON to stdout and returns the parsed
 * result, or null when the snippet produced no output.
 *
 * @throws {Error} If PowerShell exits non-zero or emits unparsable output.
 */
export default async function runPowerShellJson<T>(
  script: string,
): Promise<T | null> {
  const { stdout } = await execFileAsync(
    resolvePowerShellPath(),
    [
      "-NoProfile",
      "-NonInteractive",
      "-NoLogo",
      "-EncodedCommand",
      encodeCommand(PREAMBLE + script),
    ],
    { windowsHide: true, timeout: QUERY_TIMEOUT_MS },
  );

  // trim() also removes a leading U+FEFF, which some hosts emit regardless of
  // the encoding requested above and which JSON.parse would otherwise reject.
  const output = stdout.trim();

  if (!output) return null;

  try {
    return JSON.parse(output) as T;
  } catch {
    throw new Error(
      `Unable to parse PowerShell output as JSON. Received: ${output.slice(0, 200)}`,
    );
  }
}
