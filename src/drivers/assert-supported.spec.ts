import assertSupported from "./assert-supported";
import { Capability, CapabilityTable, PrintDriver } from "./driver";
import normalize from "../options/normalize";
import { PRINT_OPTION_NAMES } from "../options/types";
import { UnsupportedOptionError } from "../errors";

function driverWith(overrides: Partial<CapabilityTable>): PrintDriver {
  const capabilities = Object.fromEntries(
    PRINT_OPTION_NAMES.map((name) => [name, "full" as Capability]),
  ) as Record<string, Capability>;

  return {
    id: "cups",
    capabilities: { ...capabilities, ...overrides } as CapabilityTable,
    print: jest.fn(),
    getPrinters: jest.fn(),
    getDefaultPrinter: jest.fn(),
  };
}

let warn: jest.SpyInstance;

beforeEach(() => {
  warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  warn.mockRestore();
});

it("passes when every provided option is supported", () => {
  expect(() =>
    assertSupported(driverWith({}), normalize({ printer: "Zebra" })),
  ).not.toThrow();
});

it("throws when a provided option is unsupported", () => {
  expect(() =>
    assertSupported(
      driverWith({ paperKind: "none" }),
      normalize({ paperKind: 9 }),
    ),
  ).toThrow(UnsupportedOptionError);
});

it("names the offending option and backend", () => {
  expect(() =>
    assertSupported(
      driverWith({ printDialog: "none" }),
      normalize({ printDialog: true }),
    ),
  ).toThrow(/"printDialog" is not supported by the cups/);
});

it("ignores unsupported options the caller never provided", () => {
  expect(() =>
    assertSupported(driverWith({ paperKind: "none" }), normalize()),
  ).not.toThrow();
});

it("treats partial support as supported", () => {
  expect(() =>
    assertSupported(
      driverWith({ scale: "partial" }),
      normalize({ scale: "fit" }),
    ),
  ).not.toThrow();
});

describe("strict: false", () => {
  it("warns instead of throwing", () => {
    expect(() =>
      assertSupported(
        driverWith({ paperKind: "none" }),
        normalize({ paperKind: 9, strict: false }),
      ),
    ).not.toThrow();

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Ignoring option "paperKind"'),
    );
  });

  it("warns once per unsupported option", () => {
    assertSupported(
      driverWith({ paperKind: "none", printDialog: "none" }),
      normalize({ paperKind: 9, printDialog: true, strict: false }),
    );

    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("stays silent when nothing is unsupported", () => {
    assertSupported(driverWith({}), normalize({ strict: false, copies: 2 }));

    expect(warn).not.toHaveBeenCalled();
  });
});
