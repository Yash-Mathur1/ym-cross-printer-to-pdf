import {
  FileNotFoundError,
  MissingDependencyError,
  PrintError,
  InvalidOptionError,
  PdfToPrinterError,
  UnsupportedOptionError,
  UnsupportedPlatformError,
} from "./errors";

it("are real Errors, not the bare strings thrown before v6", () => {
  const error = new FileNotFoundError("No such file");

  expect(error).toBeInstanceOf(Error);
  expect(error).toBeInstanceOf(PdfToPrinterError);
  expect(error.message).toBe("No such file");
  expect(error.stack).toBeDefined();
});

it("carry a stable code and their own class name", () => {
  expect(new FileNotFoundError("x")).toMatchObject({
    code: "ENOFILE",
    name: "FileNotFoundError",
  });
  expect(new InvalidOptionError("side", ["duplex"])).toMatchObject({
    code: "EOPTION",
    name: "InvalidOptionError",
    option: "side",
  });
  expect(new UnsupportedOptionError("paperKind", "cups")).toMatchObject({
    code: "EUNSUPPORTED",
    option: "paperKind",
    driver: "cups",
  });
  expect(new UnsupportedPlatformError("aix", ["win32"])).toMatchObject({
    code: "EPLATFORM",
    platform: "aix",
    supportedPlatforms: ["win32"],
  });
});

it("preserves the pre-v6 message wording so existing matchers keep working", () => {
  expect(() => {
    throw new InvalidOptionError("side", [
      "duplex",
      "duplexshort",
      "duplexlong",
      "simplex",
    ]);
  }).toThrow(
    "Invalid side provided. Valid names: duplex, duplexshort, duplexlong, simplex",
  );

  expect(() => {
    throw new UnsupportedPlatformError("linux", ["win32"]);
  }).toThrow("Operating System not supported");
});

it("names the escape hatch when an option is unsupported", () => {
  expect(new UnsupportedOptionError("printDialog", "cups").message).toContain(
    "{ strict: false }",
  );
});

it("records a cause when one is given", () => {
  const cause = new Error("underlying");

  expect(
    new PdfToPrinterError("wrapped", "EPRINT" as never, { cause }).cause,
  ).toBe(cause);
  expect(new PdfToPrinterError("plain", "ENOFILE").cause).toBeUndefined();
});

it("carries backend diagnostics on PrintError, and omits them when absent", () => {
  expect(
    new PrintError("failed", { exitCode: 2, stderr: "boom" }),
  ).toMatchObject({
    code: "EPRINT",
    name: "PrintError",
    exitCode: 2,
    stderr: "boom",
  });

  const bare = new PrintError("failed");

  expect(bare.exitCode).toBeUndefined();
  expect(bare.stderr).toBeUndefined();
  expect(bare.cause).toBeUndefined();
});

it("names the missing command and how to install it", () => {
  const error = new MissingDependencyError("lp", "Install cups-client.");

  expect(error).toMatchObject({
    code: "EDEPENDENCY",
    name: "MissingDependencyError",
    dependency: "lp",
  });
  expect(error.message).toBe(
    'Required command "lp" was not found. Install cups-client.',
  );
});
