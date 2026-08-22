export type Subset = "odd" | "even";
export type Orientation = "portrait" | "landscape";
export type Scale = "noscale" | "shrink" | "fit";
export type Side = "duplex" | "duplexshort" | "duplexlong" | "simplex";

export const VALID_SUBSETS: readonly Subset[] = ["odd", "even"];
export const VALID_ORIENTATIONS: readonly Orientation[] = [
  "portrait",
  "landscape",
];
export const VALID_SCALES: readonly Scale[] = ["noscale", "shrink", "fit"];
export const VALID_SIDES: readonly Side[] = [
  "duplex",
  "duplexshort",
  "duplexlong",
  "simplex",
];

/** Windows-only settings, namespaced so they are obviously platform-bound. */
export interface Win32Options {
  /** Path to a SumatraPDF executable to use instead of the bundled one. */
  sumatraPdfPath?: string;
}

/**
 * Configuration options for printing PDFs
 */
export interface PrintOptions {
  printer?: string;
  pages?: string;
  subset?: Subset;
  orientation?: Orientation;
  scale?: Scale;
  monochrome?: boolean;
  side?: Side;
  bin?: string;
  paperSize?: string;
  paperKind?: number;
  silent?: boolean;
  printDialog?: boolean;
  copies?: number;
  /**
   * Path to a SumatraPDF executable to use instead of the bundled one.
   *
   * @deprecated Use `win32.sumatraPdfPath`. Still honoured, and takes effect
   * only on Windows.
   */
  sumatraPdfPath?: string;
  /** Windows-only settings. Ignored on other platforms. */
  win32?: Win32Options;
  /**
   * When true (the default), passing an option the active platform cannot
   * honour throws. Set false to downgrade that to a warning.
   */
  strict?: boolean;
}

/**
 * The subset of PrintOptions that describes the print job itself, and so can
 * meaningfully be supported or unsupported by a backend. `strict` and the
 * platform namespaces are excluded: they configure this library, not the job.
 */
export type PrintOptionName =
  | "printer"
  | "pages"
  | "subset"
  | "orientation"
  | "scale"
  | "monochrome"
  | "side"
  | "bin"
  | "paperSize"
  | "paperKind"
  | "silent"
  | "printDialog"
  | "copies";

export const PRINT_OPTION_NAMES: readonly PrintOptionName[] = [
  "printer",
  "pages",
  "subset",
  "orientation",
  "scale",
  "monochrome",
  "side",
  "bin",
  "paperSize",
  "paperKind",
  "silent",
  "printDialog",
  "copies",
];

/**
 * Options after validation and defaulting. Drivers consume this, never the
 * raw PrintOptions, so validation cannot be skipped by adding a driver.
 */
export interface NormalizedOptions {
  printer?: string;
  pages?: string;
  subset?: Subset;
  orientation?: Orientation;
  scale?: Scale;
  monochrome?: boolean;
  side?: Side;
  bin?: string;
  paperSize?: string;
  paperKind?: number;
  copies?: number;
  silent: boolean;
  printDialog: boolean;
  strict: boolean;
  win32: Win32Options;
  /** Option names the caller actually supplied, for support checking. */
  provided: readonly PrintOptionName[];
}
