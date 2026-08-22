import {
  execFile,
  ExecFileOptions,
  ExecFileOptionsWithStringEncoding,
} from "child_process";
import util from "util";

const execFilePromise = util.promisify(execFile);

/**
 * Node's default is 1 MB, which a `Get-CimInstance` query can exceed once a
 * host has many printers and each reports its full media list. Exceeding it
 * kills the child process and rejects with ERR_CHILD_PROCESS_STDIO_MAXBUFFER,
 * which surfaces as an unexplained printer-discovery failure.
 */
export const DEFAULT_MAX_BUFFER = 10 * 1024 * 1024;

export type ExecFileAsyncOptions = ExecFileOptions & {
  encoding?: BufferEncoding;
};

export type ExecFileAsyncResult = { stdout: string; stderr: string };

/**
 * Promisified `execFile` with defaults suited to spawning printing backends.
 *
 * Deliberately does not impose a default timeout: print jobs legitimately take
 * as long as the document takes to render. Callers that query rather than print
 * pass an explicit `timeout`.
 */
export default function execFileAsync(
  file: string,
  args: string[] = [],
  options: ExecFileAsyncOptions = {},
): Promise<ExecFileAsyncResult> {
  const merged: ExecFileOptionsWithStringEncoding = {
    // Every caller parses stdout as text; decode it as such rather than
    // resolving to a Buffer.
    encoding: "utf8",
    maxBuffer: DEFAULT_MAX_BUFFER,
    ...options,
  };

  return execFilePromise(file, args, merged);
}
