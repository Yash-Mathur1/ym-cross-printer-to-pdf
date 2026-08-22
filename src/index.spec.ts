import * as api from "./index";

it("exposes the three printing functions", () => {
  expect(typeof api.print).toBe("function");
  expect(typeof api.getPrinters).toBe("function");
  expect(typeof api.getDefaultPrinter).toBe("function");
});

it("exposes the error classes so callers can branch on them", () => {
  expect(typeof api.PdfToPrinterError).toBe("function");
  expect(typeof api.UnsupportedPlatformError).toBe("function");
  expect(typeof api.MissingDependencyError).toBe("function");
  expect(typeof api.FileNotFoundError).toBe("function");
  expect(typeof api.InvalidOptionError).toBe("function");
  expect(typeof api.UnsupportedOptionError).toBe("function");
  expect(typeof api.PrintError).toBe("function");
});

it("roots every error class at the shared base", () => {
  for (const name of [
    "UnsupportedPlatformError",
    "MissingDependencyError",
    "FileNotFoundError",
    "InvalidOptionError",
    "UnsupportedOptionError",
    "PrintError",
  ] as const) {
    expect(api[name].prototype).toBeInstanceOf(api.PdfToPrinterError);
  }
});

it("can be imported on any platform without throwing", () => {
  // Platform support is resolved per call, so requiring the package on an
  // unsupported host must not fail at import time.
  expect(() => require("./index")).not.toThrow();
});
