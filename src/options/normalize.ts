import { InvalidOptionError } from "../errors";
import {
  NormalizedOptions,
  PRINT_OPTION_NAMES,
  PrintOptionName,
  PrintOptions,
  VALID_ORIENTATIONS,
  VALID_SCALES,
  VALID_SIDES,
  VALID_SUBSETS,
} from "./types";

/**
 * Validates and defaults user-supplied options once, before any driver sees
 * them, so an invalid value fails identically on every platform.
 *
 * @throws {InvalidOptionError} If a value falls outside its allowed set.
 */
export default function normalize(
  options: PrintOptions = {},
): NormalizedOptions {
  const {
    printer,
    pages,
    subset,
    orientation,
    scale,
    monochrome,
    side,
    bin,
    paperSize,
    paperKind,
    copies,
  } = options;

  return {
    printer,
    pages,
    subset: assertOneOf("subset", subset, VALID_SUBSETS),
    orientation: assertOneOf("orientation", orientation, VALID_ORIENTATIONS),
    scale: assertOneOf("scale", scale, VALID_SCALES),
    side: assertOneOf("side", side, VALID_SIDES),
    monochrome,
    bin,
    paperSize,
    paperKind,
    copies: assertPositiveInteger("copies", copies),
    // Historically silent defaults on, and any value but an explicit false
    // keeps it on.
    silent: options.silent !== false,
    printDialog: options.printDialog === true,
    strict: options.strict !== false,
    win32: {
      // The namespaced option wins; the deprecated top-level one still works.
      sumatraPdfPath: options.win32?.sumatraPdfPath ?? options.sumatraPdfPath,
    },
    provided: collectProvided(options),
  };
}

/**
 * Records which job options the caller actually set, so support checking can
 * distinguish "not requested" from "requested and defaulted".
 */
function collectProvided(options: PrintOptions): PrintOptionName[] {
  return PRINT_OPTION_NAMES.filter((name) => options[name] !== undefined);
}

function assertOneOf<T extends string>(
  option: string,
  value: T | undefined,
  valid: readonly T[],
): T | undefined {
  if (value === undefined) return undefined;
  if (valid.includes(value)) return value;

  throw new InvalidOptionError(option, valid);
}

/**
 * Guards counts that must be whole and at least one. Left unchecked, `copies: 0`
 * silently printed a single copy and a negative value reached the backend as a
 * malformed setting.
 */
function assertPositiveInteger(
  option: string,
  value: number | undefined,
): number | undefined {
  if (value === undefined) return undefined;
  if (Number.isInteger(value) && value >= 1) return value;

  throw new InvalidOptionError(option, ["a whole number of 1 or more"]);
}
