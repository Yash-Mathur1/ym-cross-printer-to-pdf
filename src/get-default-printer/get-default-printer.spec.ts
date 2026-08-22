import { mocked } from "jest-mock";
import getDefaultPrinter from "./get-default-printer";
import runPowerShellJson from "../drivers/windows/powershell";
import { Printer } from "..";

jest.mock("os", () => ({
  ...jest.requireActual("os"),
  platform: () => "win32",
}));
jest.mock("../drivers/windows/powershell");
const mockedRun = mocked(runPowerShellJson);

afterEach(() => {
  mockedRun.mockReset();
});

it("gets the default printer", async () => {
  mockedRun.mockResolvedValue([
    {
      DeviceID: "Microsoft Print to PDF",
      Name: "Microsoft Print to PDF",
      PrinterPaperNames: ["A4", "144mm x 100mm"],
    },
  ]);

  const result: Printer | null = await getDefaultPrinter();

  expect(result).toStrictEqual({
    deviceId: "Microsoft Print to PDF",
    name: "Microsoft Print to PDF",
    paperSizes: ["A4", "144mm x 100mm"],
  });
});

it("returns null when default printer is not defined", async () => {
  mockedRun.mockResolvedValue(null);

  await expect(getDefaultPrinter()).resolves.toBeNull();
});

it("returns null when the row lacks DeviceID or Name", async () => {
  mockedRun.mockResolvedValue([{ PrinterPaperNames: ["A4"] }]);

  await expect(getDefaultPrinter()).resolves.toBeNull();
});

it("throws when the query fails", async () => {
  mockedRun.mockRejectedValue("error");

  await expect(getDefaultPrinter()).rejects.toBe("error");
});
