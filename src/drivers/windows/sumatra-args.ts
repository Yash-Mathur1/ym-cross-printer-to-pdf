import { NormalizedOptions } from "../../options/types";

/**
 * Builds SumatraPDF's argv.
 *
 * Values are already validated by `normalize`; this maps only. Ordering is
 * significant to callers who assert on it and is deliberately preserved.
 */
export default function buildSumatraArgs(
  pdf: string,
  options: NormalizedOptions,
): string[] {
  const args: string[] = [];

  if (options.printDialog) {
    args.push("-print-dialog");
  } else {
    if (options.printer) args.push("-print-to", options.printer);
    else args.push("-print-to-default");

    if (options.silent) args.push("-silent");
  }

  const printSettings = buildPrintSettings(options);

  if (printSettings.length) {
    args.push("-print-settings", printSettings.join(","));
  }

  args.push(pdf);

  return args;
}

function buildPrintSettings(options: NormalizedOptions): string[] {
  const printSettings: string[] = [];

  if (options.pages) printSettings.push(options.pages);
  if (options.subset) printSettings.push(options.subset);
  if (options.orientation) printSettings.push(options.orientation);
  if (options.scale) printSettings.push(options.scale);

  if (options.monochrome) printSettings.push("monochrome");
  else if (options.monochrome === false) printSettings.push("color");

  if (options.side) printSettings.push(options.side);
  if (options.bin) printSettings.push(`bin=${options.bin}`);
  if (options.paperSize) printSettings.push(`paper=${options.paperSize}`);
  if (options.paperKind) printSettings.push(`paperkind=${options.paperKind}`);
  if (options.copies) printSettings.push(`${options.copies}x`);

  return printSettings;
}
