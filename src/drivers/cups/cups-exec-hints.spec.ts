/**
 * The install hint is the only thing a user sees when CUPS is absent, so each
 * platform's wording is pinned here.
 */
const enoent = Object.assign(new Error("spawn lp ENOENT"), { code: "ENOENT" });

function loadRunCups(platform: string, procVersion?: string) {
  jest.resetModules();

  jest.doMock("os", () => ({
    ...jest.requireActual("os"),
    platform: () => platform,
  }));

  jest.doMock("fs", () => ({
    ...jest.requireActual("fs"),
    readFileSync: (file: string) => {
      if (file === "/proc/version" && procVersion !== undefined)
        return procVersion;
      throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    },
  }));

  jest.doMock("../../utils/exec-file-async", () => ({
    __esModule: true,
    default: jest.fn().mockRejectedValue(enoent),
  }));

  return require("./cups-exec").default as (
    binary: string,
    args: string[],
  ) => Promise<unknown>;
}

afterEach(() => {
  jest.resetModules();
  jest.dontMock("os");
  jest.dontMock("fs");
  jest.dontMock("../../utils/exec-file-async");
});

it("points Linux users at the cups-client package", async () => {
  await expect(
    loadRunCups("linux", "Linux version 6.1.0 (gcc)")("lp", []),
  ).rejects.toThrow(/cups-client/);
});

it("explains that WSL has no print stack rather than suggesting a package", async () => {
  const run = loadRunCups(
    "linux",
    "Linux version 5.15.0-microsoft-standard-WSL2",
  );

  await expect(run("lp", [])).rejects.toThrow(/WSL has no print stack/);
  await expect(run("lp", [])).rejects.not.toThrow(/apt install/);
});

it("treats an unreadable /proc/version as not-WSL", async () => {
  await expect(loadRunCups("linux")("lp", [])).rejects.toThrow(/cups-client/);
});

it("tells macOS users their PATH is the likely problem", async () => {
  await expect(loadRunCups("darwin")("lp", [])).rejects.toThrow(
    /ships with macOS/,
  );
});
