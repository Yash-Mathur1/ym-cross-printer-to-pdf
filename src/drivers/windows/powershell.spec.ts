import path from "path";
import { mocked } from "jest-mock";
import execFileAsync from "../../utils/exec-file-async";
import runPowerShellJson, {
  encodeCommand,
  resolvePowerShellPath,
} from "./powershell";

jest.mock("../../utils/exec-file-async");
const mockedExec = mocked(execFileAsync);

const originalSystemRoot = process.env.SystemRoot;

beforeEach(() => {
  process.env.SystemRoot = "C:\Windows";
  mockedExec.mockResolvedValue({ stdout: "[]", stderr: "" });
});

afterEach(() => {
  mockedExec.mockReset();
  if (originalSystemRoot === undefined) delete process.env.SystemRoot;
  else process.env.SystemRoot = originalSystemRoot;
});

/** Reads back the script that was actually handed to PowerShell. */
function decodeInvokedScript(): string {
  const args = mockedExec.mock.calls[0][1] as string[];
  return Buffer.from(
    args[args.indexOf("-EncodedCommand") + 1],
    "base64",
  ).toString("utf16le");
}

describe("resolvePowerShellPath", () => {
  it("resolves through SystemRoot rather than trusting PATH", () => {
    expect(resolvePowerShellPath()).toBe(
      path.join(
        "C:\Windows",
        "System32",
        "WindowsPowerShell",
        "v1.0",
        "powershell.exe",
      ),
    );
  });

  it("falls back to a bare name when SystemRoot is unset", () => {
    delete process.env.SystemRoot;
    delete process.env.SYSTEMROOT;

    expect(resolvePowerShellPath()).toBe("powershell.exe");
  });
});

describe("encodeCommand", () => {
  it("encodes as base64 of UTF-16LE, as -EncodedCommand requires", () => {
    expect(
      Buffer.from(encodeCommand("echo 'hi'"), "base64").toString("utf16le"),
    ).toBe("echo 'hi'");
  });
});

describe("runPowerShellJson", () => {
  it("runs without profile or interaction and keeps the window hidden", async () => {
    await runPowerShellJson("Get-Thing");

    const [file, args, options] = mockedExec.mock.calls[0];

    expect(file).toContain("powershell.exe");
    expect(args).toEqual(
      expect.arrayContaining(["-NoProfile", "-NonInteractive", "-NoLogo"]),
    );
    expect(options).toMatchObject({ windowsHide: true });
    expect((options as { timeout: number }).timeout).toBeGreaterThan(0);
  });

  it("prepends the UTF-8 preamble to the caller's script", async () => {
    await runPowerShellJson("Get-Thing");

    const script = decodeInvokedScript();

    expect(script).toContain("UTF8Encoding $false");
    expect(script).toContain("$ProgressPreference='SilentlyContinue'");
    expect(script.endsWith("Get-Thing")).toBe(true);
  });

  it("parses JSON output", async () => {
    mockedExec.mockResolvedValue({
      stdout: '{"DeviceID":"hp"}\r\n',
      stderr: "",
    });

    await expect(runPowerShellJson("q")).resolves.toEqual({ DeviceID: "hp" });
  });

  it("tolerates a byte order mark ahead of the JSON", async () => {
    mockedExec.mockResolvedValue({
      stdout: `${String.fromCharCode(0xfeff)}[{"DeviceID":"hp"}]`,
      stderr: "",
    });

    await expect(runPowerShellJson("q")).resolves.toEqual([{ DeviceID: "hp" }]);
  });

  it("returns null when the script produced no output", async () => {
    mockedExec.mockResolvedValue({ stdout: "   \r\n ", stderr: "" });

    await expect(runPowerShellJson("q")).resolves.toBeNull();
  });

  it("reports unparsable output rather than leaking a SyntaxError", async () => {
    mockedExec.mockResolvedValue({
      stdout: "Get-CimInstance : Access denied",
      stderr: "",
    });

    await expect(runPowerShellJson("q")).rejects.toThrow(
      /Unable to parse PowerShell output as JSON/,
    );
  });

  it("propagates a failure to spawn PowerShell", async () => {
    mockedExec.mockRejectedValue(new Error("spawn ENOENT"));

    await expect(runPowerShellJson("q")).rejects.toThrow("spawn ENOENT");
  });
});
