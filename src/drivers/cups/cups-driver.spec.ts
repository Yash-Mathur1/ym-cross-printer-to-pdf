import fs from "fs";
import path from "path";
import { mocked } from "jest-mock";
import runCups, { runCupsQuery } from "./cups-exec";
import cupsDriver, { mapWithLimit } from "./cups-driver";
import normalize from "../../options/normalize";
import { PrintError } from "../../errors";

jest.mock("./cups-exec");
const mockedRun = mocked(runCups);
const mockedQuery = mocked(runCupsQuery);

const fixture = (name: string) =>
  fs.readFileSync(
    path.join(__dirname, "..", "..", "__fixtures__", "cups", name),
    "utf8",
  );

/** Routes each query to the fixture for the command it represents. */
function respondFromFixtures() {
  mockedQuery.mockImplementation(async (binary, args) => {
    if (binary === "lpoptions") return fixture("lpoptions-l.txt");
    if (args.includes("-d")) return "system default destination: Zebra_ZTC_ZPL";
    if (args.includes("-l")) return fixture("lpstat-l-p.txt");
    return fixture("lpstat-e.txt");
  });
}

beforeEach(() => {
  mockedRun.mockResolvedValue({ stdout: "", stderr: "" });
  respondFromFixtures();
  delete process.env.LPDEST;
  delete process.env.PRINTER;
});

afterEach(() => {
  mockedRun.mockReset();
  mockedQuery.mockReset();
});

describe("capabilities", () => {
  it("refuses options CUPS genuinely cannot express", () => {
    expect(cupsDriver.capabilities.paperKind).toBe("none");
    expect(cupsDriver.capabilities.printDialog).toBe("none");
  });

  it("marks approximations as partial rather than pretending", () => {
    expect(cupsDriver.capabilities.scale).toBe("partial");
    expect(cupsDriver.capabilities.bin).toBe("partial");
    expect(cupsDriver.capabilities.silent).toBe("partial");
  });
});

describe("print", () => {
  it("spawns lp with the mapped arguments", async () => {
    await cupsDriver.print("doc.pdf", normalize({ printer: "Zebra_ZTC_ZPL" }));

    const [binary, args] = mockedRun.mock.calls[0];

    expect(binary).toBe("lp");
    expect(args.slice(0, 2)).toEqual(["-d", "Zebra_ZTC_ZPL"]);
  });

  it("wraps a backend failure as a PrintError carrying its diagnostics", async () => {
    mockedRun.mockRejectedValue(
      Object.assign(new Error("exit 1"), {
        code: 1,
        stderr: 'lp: Destination "nope" does not exist.',
      }),
    );

    const error = await cupsDriver
      .print("doc.pdf", normalize())
      .catch((e) => e as PrintError);

    expect(error).toBeInstanceOf(PrintError);
    expect(error.code).toBe("EPRINT");
    expect(error.exitCode).toBe(1);
    expect(error.stderr).toContain("does not exist");
    expect(error.message).toContain("does not exist");
  });
});

describe("getPrinters", () => {
  it("returns every queue with its description and media", async () => {
    const printers = await cupsDriver.getPrinters();

    expect(printers).toHaveLength(4);
    expect(printers[0]).toMatchObject({
      deviceId: "HP_LaserJet_Pro",
      name: "HP LaserJet Pro M404dn",
    });
    expect(printers[0].paperSizes).toContain("A4");
  });

  it("falls back to the queue name when there is no description", async () => {
    const printers = await cupsDriver.getPrinters();

    expect(printers.find((p) => p.deviceId === "PDF")?.name).toBe("PDF");
  });

  it("returns nothing when no queues are configured", async () => {
    mockedQuery.mockResolvedValue("");

    await expect(cupsDriver.getPrinters()).resolves.toEqual([]);
  });
});

describe("getDefaultPrinter", () => {
  it("reads the CUPS default destination", async () => {
    await expect(cupsDriver.getDefaultPrinter()).resolves.toMatchObject({
      deviceId: "Zebra_ZTC_ZPL",
      name: "Zebra ZTC ZPL Label Printer",
    });
  });

  it("prefers LPDEST, as lp itself does", async () => {
    process.env.LPDEST = "HP_LaserJet_Pro";

    await expect(cupsDriver.getDefaultPrinter()).resolves.toMatchObject({
      deviceId: "HP_LaserJet_Pro",
    });
  });

  it("falls back to PRINTER when LPDEST is unset", async () => {
    process.env.PRINTER = "HP_LaserJet_Pro";

    await expect(cupsDriver.getDefaultPrinter()).resolves.toMatchObject({
      deviceId: "HP_LaserJet_Pro",
    });
  });

  it("returns null when the environment names a queue that is gone", async () => {
    process.env.LPDEST = "deleted_queue";

    await expect(cupsDriver.getDefaultPrinter()).resolves.toBeNull();
  });

  it("falls back to the queue name when the default has no description", async () => {
    process.env.LPDEST = "PDF";

    await expect(cupsDriver.getDefaultPrinter()).resolves.toMatchObject({
      deviceId: "PDF",
      name: "PDF",
    });
  });

  it("returns null when there is no default", async () => {
    mockedQuery.mockImplementation(async (binary, args) =>
      args.includes("-d")
        ? "no system default destination"
        : fixture("lpstat-e.txt"),
    );

    await expect(cupsDriver.getDefaultPrinter()).resolves.toBeNull();
  });
});

describe("mapWithLimit", () => {
  it("preserves input order regardless of completion order", async () => {
    const result = await mapWithLimit([30, 10, 20], 2, async (ms) => {
      await new Promise((resolve) => setTimeout(resolve, ms / 10));
      return ms;
    });

    expect(result).toEqual([30, 10, 20]);
  });

  it("never exceeds the concurrency limit", async () => {
    let active = 0;
    let peak = 0;

    await mapWithLimit(
      Array.from({ length: 20 }, (_, i) => i),
      4,
      async () => {
        peak = Math.max(peak, ++active);
        await new Promise((resolve) => setTimeout(resolve, 1));
        active--;
        return null;
      },
    );

    expect(peak).toBeLessThanOrEqual(4);
  });

  it("handles an empty list without spawning workers", async () => {
    await expect(mapWithLimit([], 4, async () => null)).resolves.toEqual([]);
  });
});
