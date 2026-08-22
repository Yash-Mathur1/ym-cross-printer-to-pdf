import { mocked } from "jest-mock";
import execFileAsync from "../utils/exec-file-async";
import runPowerShellJson from "./windows/powershell";
import runCups, { runCupsQuery } from "./cups/cups-exec";
import windowsDriver from "./windows/windows-driver";
import cupsDriver from "./cups/cups-driver";
import assertSupported from "./assert-supported";
import { PrintDriver } from "./driver";
import normalize from "../options/normalize";
import { PRINT_OPTION_NAMES, PrintOptions } from "../options/types";
import { PrintError, UnsupportedOptionError } from "../errors";

jest.mock("../utils/exec-file-async");
jest.mock("./windows/powershell");
jest.mock("./cups/cups-exec");
jest.mock("../utils/electron-util", () => ({
  __esModule: true,
  default: (value: string) => value,
}));

const mockedExec = mocked(execFileAsync);
const mockedPowerShell = mocked(runPowerShellJson);
const mockedCups = mocked(runCups);
const mockedCupsQuery = mocked(runCupsQuery);

type FakePrinter = { id: string; name: string; sizes: string[] };

/**
 * Lets one suite of assertions drive both backends. Each harness knows only how
 * to stage its own process layer; everything above that must behave alike.
 *
 * Divergence in these behaviours is what makes a cross-platform library painful
 * to depend on, so they are pinned here rather than per-driver.
 */
type Harness = {
  name: string;
  driver: PrintDriver;
  printSucceeds(): void;
  printFails(error: unknown): void;
  hasPrinters(printers: FakePrinter[]): void;
  hasDefault(id: string | null): void;
};

/** Shared so that hasDefault means the same thing to both harnesses. */
const state = { defaultId: null as string | null };

const windows: Harness = {
  name: "windows",
  driver: windowsDriver,

  printSucceeds() {
    mockedExec.mockResolvedValue({ stdout: "", stderr: "" });
  },

  printFails(error) {
    mockedExec.mockRejectedValue(error);
  },

  hasPrinters(printers) {
    const rows = printers.map((printer) => ({
      DeviceID: printer.id,
      Name: printer.name,
      PrinterPaperNames: printer.sizes,
    }));

    mockedPowerShell.mockImplementation(async (script: string) =>
      script.includes("-Filter")
        ? rows.filter((row) => row.DeviceID === state.defaultId)
        : rows,
    );
  },

  hasDefault(id) {
    state.defaultId = id;
  },
};

const cups: Harness = {
  name: "cups",
  driver: cupsDriver,

  printSucceeds() {
    mockedCups.mockResolvedValue({
      stdout: "request id is q-1 (1 file(s))",
      stderr: "",
    });
  },

  printFails(error) {
    mockedCups.mockRejectedValue(error);
  },

  hasPrinters(printers) {
    mockedCupsQuery.mockImplementation(async (binary, args) => {
      if (binary === "lpoptions") {
        const printer = printers.find((candidate) => candidate.id === args[1]);
        return printer ? `PageSize/Media Size: ${printer.sizes.join(" ")}` : "";
      }

      if (args.includes("-d")) {
        return state.defaultId
          ? `system default destination: ${state.defaultId}`
          : "no system default destination";
      }

      if (args.includes("-l")) {
        return printers
          .map((p) => `printer ${p.id} is idle.\n\tDescription: ${p.name}\n`)
          .join("");
      }

      return printers.map((p) => p.id).join("\n");
    });
  },

  hasDefault(id) {
    state.defaultId = id;
  },
};

const harnesses = [windows, cups];

const SAMPLE: FakePrinter[] = [
  { id: "Queue_One", name: "Printer One", sizes: ["A4", "Letter"] },
  { id: "Queue_Two", name: "Printer Two", sizes: [] },
];

beforeEach(() => {
  state.defaultId = null;
  delete process.env.LPDEST;
  delete process.env.PRINTER;
});

afterEach(() => {
  mockedExec.mockReset();
  mockedPowerShell.mockReset();
  mockedCups.mockReset();
  mockedCupsQuery.mockReset();
});

describe.each(harnesses)("$name driver satisfies the contract", (harness) => {
  describe("capabilities", () => {
    it("declares a level for every option the library accepts", () => {
      expect(Object.keys(harness.driver.capabilities).sort()).toEqual(
        [...PRINT_OPTION_NAMES].sort(),
      );
    });

    it("uses only the three defined levels", () => {
      for (const level of Object.values(harness.driver.capabilities)) {
        expect(["full", "partial", "none"]).toContain(level);
      }
    });
  });

  describe("getPrinters", () => {
    it("returns one well-formed entry per printer", async () => {
      harness.hasPrinters(SAMPLE);

      const printers = await harness.driver.getPrinters();

      expect(printers).toHaveLength(2);

      for (const printer of printers) {
        expect(typeof printer.deviceId).toBe("string");
        expect(printer.deviceId).not.toBe("");
        expect(typeof printer.name).toBe("string");
        expect(printer.name).not.toBe("");
        expect(Array.isArray(printer.paperSizes)).toBe(true);
      }
    });

    it("returns an empty array when the host has no printers", async () => {
      harness.hasPrinters([]);

      await expect(harness.driver.getPrinters()).resolves.toEqual([]);
    });

    it("reports paper sizes when the backend knows them", async () => {
      harness.hasPrinters(SAMPLE);

      const [first] = await harness.driver.getPrinters();

      expect(first.paperSizes).toEqual(["A4", "Letter"]);
    });

    it("reports an empty list, not null, when a printer has no media", async () => {
      harness.hasPrinters(SAMPLE);

      const printers = await harness.driver.getPrinters();

      expect(printers[1].paperSizes).toEqual([]);
    });
  });

  describe("getDefaultPrinter", () => {
    it("returns null when no default is set", async () => {
      harness.hasPrinters(SAMPLE);
      harness.hasDefault(null);

      await expect(harness.driver.getDefaultPrinter()).resolves.toBeNull();
    });

    it("returns the default as a well-formed printer", async () => {
      harness.hasDefault("Queue_One");
      harness.hasPrinters(SAMPLE);

      await expect(harness.driver.getDefaultPrinter()).resolves.toMatchObject({
        deviceId: "Queue_One",
        name: "Printer One",
      });
    });
  });

  describe("print", () => {
    it("resolves with no value on success", async () => {
      harness.printSucceeds();

      await expect(
        harness.driver.print("doc.pdf", normalize()),
      ).resolves.toBeUndefined();
    });

    it("rejects with a PrintError when the backend exits non-zero", async () => {
      harness.printFails(
        Object.assign(new Error("exit 1"), {
          code: 1,
          stderr: "backend said no",
        }),
      );

      const error = await harness.driver
        .print("doc.pdf", normalize())
        .catch((e) => e as PrintError);

      expect(error).toBeInstanceOf(PrintError);
      expect(error.code).toBe("EPRINT");
      expect(error.exitCode).toBe(1);
      expect(error.stderr).toBe("backend said no");
      expect(error.cause).toBeDefined();
    });

    it("still produces a PrintError when the backend says nothing useful", async () => {
      harness.printFails(new Error("spawn failed"));

      await expect(
        harness.driver.print("doc.pdf", normalize()),
      ).rejects.toBeInstanceOf(PrintError);
    });
  });

  describe("option handling", () => {
    it("rejects options it cannot honour, and accepts the rest", () => {
      for (const option of PRINT_OPTION_NAMES) {
        const check = () =>
          assertSupported(harness.driver, {
            ...normalize(),
            provided: [option],
          });

        if (harness.driver.capabilities[option] === "none") {
          expect(check).toThrow(UnsupportedOptionError);
        } else {
          expect(check).not.toThrow();
        }
      }
    });

    it("names the offending option so callers can act on it", () => {
      const unsupported = PRINT_OPTION_NAMES.filter(
        (option) => harness.driver.capabilities[option] === "none",
      );

      for (const option of unsupported) {
        expect(() =>
          assertSupported(harness.driver, {
            ...normalize(),
            provided: [option],
          }),
        ).toThrow(new RegExp(`"${option}"`));
      }
    });
  });
});

describe("behaviour that must not vary by platform", () => {
  it.each([
    ["subset", { subset: "nope" }],
    ["orientation", { orientation: "nope" }],
    ["scale", { scale: "nope" }],
    ["side", { side: "nope" }],
  ])("rejects an invalid %s before a driver is chosen", (_option, options) => {
    expect(() => normalize(options as PrintOptions)).toThrow(/^Invalid /);
  });

  it("gives each driver a distinct id", () => {
    const ids = harnesses.map((harness) => harness.driver.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
