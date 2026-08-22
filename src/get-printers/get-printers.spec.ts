import { mocked } from "jest-mock";
import { Printer } from "..";
import runPowerShellJson from "../drivers/windows/powershell";
import getPrinters from "./get-printers";

jest.mock("os", () => ({
  ...jest.requireActual("os"),
  platform: () => "win32",
}));
jest.mock("../drivers/windows/powershell");
const mockedRun = mocked(runPowerShellJson);

afterEach(() => {
  mockedRun.mockReset();
});

it("returns list of available printers", async () => {
  mockedRun.mockResolvedValue([
    { DeviceID: "OneNote", Name: "OneNote", PrinterPaperNames: null },
    {
      DeviceID: "Microsoft-XPS-Document-Writer",
      Name: "Microsoft XPS Document Writer",
      PrinterPaperNames: ["A4", "Letter"],
    },
    {
      DeviceID: "Microsoft_Print_to_PDF",
      Name: "Microsoft Print to PDF",
      PrinterPaperNames: [],
    },
  ]);

  const result: Printer[] = await getPrinters();

  expect(result).toStrictEqual([
    { deviceId: "OneNote", name: "OneNote", paperSizes: [] },
    {
      deviceId: "Microsoft-XPS-Document-Writer",
      name: "Microsoft XPS Document Writer",
      paperSizes: ["A4", "Letter"],
    },
    {
      deviceId: "Microsoft_Print_to_PDF",
      name: "Microsoft Print to PDF",
      paperSizes: [],
    },
  ]);
});

it("skips rows missing the identity fields", async () => {
  mockedRun.mockResolvedValue([
    { PrinterPaperNames: ["A4"] },
    { DeviceID: "Fax" },
    { Name: "Fax" },
  ]);

  await expect(getPrinters()).resolves.toEqual([]);
});

it("returns an empty list when there are no printers", async () => {
  mockedRun.mockResolvedValue(null);

  await expect(getPrinters()).resolves.toEqual([]);
});

it("fails with an error", async () => {
  mockedRun.mockRejectedValue("error");

  await expect(getPrinters()).rejects.toBe("error");
});
