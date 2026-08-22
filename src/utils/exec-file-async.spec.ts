import execFileAsync, { DEFAULT_MAX_BUFFER } from "./exec-file-async";

// Exercised against a real child process: the value of this wrapper is the
// defaults it hands to execFile, which a mocked child_process would not prove.

it("resolves with stdout and stderr", async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    "-e",
    "process.stdout.write('ok')",
  ]);

  expect(stdout).toBe("ok");
});

it("defaults args to an empty list", async () => {
  // Node with no script argument waits on stdin, which execFile holds open, so
  // this reliably reaches the timeout rather than failing to spawn.
  await expect(
    execFileAsync(process.execPath, undefined, { timeout: 250 }),
  ).rejects.toThrow();
});

it("defaults to a buffer large enough for a long printer list", async () => {
  // Node's own default is 1 MB. A host with many printers, each reporting a
  // full media list, exceeds that once paperSizes is no longer truncated.
  expect(DEFAULT_MAX_BUFFER).toBeGreaterThan(1024 * 1024);

  const { stdout } = await execFileAsync(process.execPath, [
    "-e",
    "process.stdout.write('x'.repeat(2 * 1024 * 1024))",
  ]);

  expect(stdout).toHaveLength(2 * 1024 * 1024);
});

it("lets callers override the defaults", async () => {
  await expect(
    execFileAsync(
      process.execPath,
      ["-e", "process.stdout.write('x'.repeat(4096))"],
      { maxBuffer: 128 },
    ),
  ).rejects.toThrow();
});

it("honours an explicit timeout", async () => {
  await expect(
    execFileAsync(process.execPath, ["-e", "setTimeout(() => {}, 30000)"], {
      timeout: 250,
    }),
  ).rejects.toThrow();
});

it("rejects when the child exits non-zero", async () => {
  await expect(
    execFileAsync(process.execPath, ["-e", "process.exit(3)"]),
  ).rejects.toThrow();
});
