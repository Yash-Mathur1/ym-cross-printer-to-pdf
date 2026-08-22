/**
 * Stable, machine-readable discriminators. Prefer branching on these over
 * matching error messages, which are not part of the public contract.
 */
export type PdfToPrinterErrorCode =
  | "EPLATFORM"
  | "EDEPENDENCY"
  | "ENOFILE"
  | "EOPTION"
  | "EUNSUPPORTED"
  | "EPRINT";

/**
 * Base class for every error this library raises on purpose.
 *
 * Prior to v6 some failures were thrown as bare strings, which left callers
 * with no stack and an undefined `message`.
 */
export class PdfToPrinterError extends Error {
  readonly code: PdfToPrinterErrorCode;
  readonly cause?: unknown;

  constructor(
    message: string,
    code: PdfToPrinterErrorCode,
    options: { cause?: unknown } = {},
  ) {
    super(message);
    // A string literal, not new.target.name: minifiers rename classes, which
    // would leave consumers reading a mangled identifier out of error.name.
    this.name = "PdfToPrinterError";
    this.code = code;
    if (options.cause !== undefined) this.cause = options.cause;
    // Restores the prototype chain when compiled below ES6, so `instanceof`
    // keeps working for consumers on older targets.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** The current platform has no printing backend. */
export class UnsupportedPlatformError extends PdfToPrinterError {
  readonly platform: string;
  readonly supportedPlatforms: readonly string[];

  constructor(platform: string, supportedPlatforms: readonly string[]) {
    super(
      `Operating System not supported: ${platform}. ` +
        `Supported platforms: ${supportedPlatforms.join(", ")}.`,
      "EPLATFORM",
    );
    this.name = "UnsupportedPlatformError";
    this.platform = platform;
    this.supportedPlatforms = supportedPlatforms;
  }
}

/** The document to print is missing or was not specified. */
export class FileNotFoundError extends PdfToPrinterError {
  constructor(message: string) {
    super(message, "ENOFILE");
    this.name = "FileNotFoundError";
  }
}

/** An option was supplied with a value outside its allowed set. */
export class InvalidOptionError extends PdfToPrinterError {
  readonly option: string;

  constructor(option: string, validValues: readonly string[]) {
    super(
      `Invalid ${option} provided. Valid names: ${validValues.join(", ")}`,
      "EOPTION",
    );
    this.name = "InvalidOptionError";
    this.option = option;
  }
}

/**
 * A valid option that the active platform's backend cannot honour.
 *
 * Raised instead of silently dropping the option, because a print that
 * quietly ignores `paperSize` wastes physical stock.
 */
export class UnsupportedOptionError extends PdfToPrinterError {
  readonly option: string;
  readonly driver: string;

  constructor(option: string, driver: string) {
    super(
      `Option "${option}" is not supported by the ${driver} printing backend. ` +
        `Remove it, or pass { strict: false } to ignore unsupported options.`,
      "EUNSUPPORTED",
    );
    this.name = "UnsupportedOptionError";
    this.option = option;
    this.driver = driver;
  }
}

/**
 * A required external binary is not installed.
 *
 * Raised in place of a raw ENOENT from the spawn, which gives the caller no
 * indication of what to install.
 */
export class MissingDependencyError extends PdfToPrinterError {
  readonly dependency: string;

  constructor(dependency: string, hint: string) {
    super(
      `Required command "${dependency}" was not found. ${hint}`,
      "EDEPENDENCY",
    );
    this.name = "MissingDependencyError";
    this.dependency = dependency;
  }
}

/**
 * The printing backend ran but failed.
 *
 * Carries the backend's own diagnostics, which are usually the only thing that
 * explains a rejected job.
 */
export class PrintError extends PdfToPrinterError {
  readonly exitCode?: number;
  readonly stderr?: string;

  constructor(
    message: string,
    details: { cause?: unknown; exitCode?: number; stderr?: string } = {},
  ) {
    super(message, "EPRINT", { cause: details.cause });
    this.name = "PrintError";
    this.exitCode = details.exitCode;
    this.stderr = details.stderr;
  }
}
