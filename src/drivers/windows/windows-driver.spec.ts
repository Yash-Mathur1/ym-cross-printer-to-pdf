import { mocked } from "jest-mock";
import execFileAsync from "../../utils/exec-file-async";
import normalize from "../../options/normalize";
import { PRINT_OPTION_NAMES } from "../../options/types";
import runPowerShellJson from "./powershell";
import windowsDriver from "./windows-driver";

jest.mock("../../utils/exec-file-async");
jest.mock("./powershell");
jest.mock("../../utils/electron-util", () => ({
  __esModule: true,
  default: (p: string) => p,
}));

const mockedExec = mocked(execFileAsync);
const mockedRun = mocked(runPowerShellJson);

beforeEach(() => {
  mockedExec.mockResolvedValue({ stdout: "", stderr: "" });
});

afterEach(() => {
  mockedExec.mockReset();
  mockedRun.mockReset();
});

it("supports every option this library models", () => {
  // SumatraPDF is the reference implementation; a gap here means the option
  // model drifted from what the Windows backend can actually do.
  for (const name of PRINT_OPTION_NAMES) {
    expect(windowsDriver.capabilities[name]).toBe("full");
  }
});

it("spawns SumatraPDF with the built argv", async () => {
  await windowsDriver.print("doc.pdf", normalize({ printer: "Zebra" }));

  const [binary, args] = mockedExec.mock.calls[0];

  expect(binary).toContain("SumatraPDF");
  expect(args).toEqual(["-print-to", "Zebra", "-silent", "doc.pdf"]);
});

it("honours a custom SumatraPDF path", async () => {
  await windowsDriver.print(
    "doc.pdf",
    normalize({ win32: { sumatraPdfPath: "custom.exe" } }),
  );

  expect(mockedExec.mock.calls[0][0]).toBe("custom.exe");
});

it("maps discovered printers", async () => {
  mockedRun.mockResolvedValue([
    { DeviceID: "hp", Name: "HP", PrinterPaperNames: ["A4"] },
  ]);

  await expect(windowsDriver.getPrinters()).resolves.toEqual([
    { deviceId: "hp", name: "HP", paperSizes: ["A4"] },
  ]);
});

it("returns the default printer, or null when there is none", async () => {
  mockedRun.mockResolvedValue([{ DeviceID: "hp", Name: "HP" }]);
  await expect(windowsDriver.getDefaultPrinter()).resolves.toMatchObject({
    deviceId: "hp",
  });

  mockedRun.mockResolvedValue(null);
  await expect(windowsDriver.getDefaultPrinter()).resolves.toBeNull();
});
