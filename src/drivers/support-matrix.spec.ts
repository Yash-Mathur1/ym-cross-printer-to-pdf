import fs from "fs";
import path from "path";
import cupsDriver from "./cups/cups-driver";
import windowsDriver from "./windows/windows-driver";
import { Capability } from "./driver";
import { PRINT_OPTION_NAMES, PrintOptionName } from "../options/types";

/**
 * The README documents what each platform can do. Documentation that drifts
 * from the drivers is worse than none, so the published table is parsed and
 * compared against the capability tables themselves.
 */

const README = fs.readFileSync(
  path.join(__dirname, "..", "..", "README.md"),
  "utf8",
);

const LABELS: Record<string, Capability> = {
  Full: "full",
  Partial: "partial",
  None: "none",
};

function parseSupportMatrix(): Map<
  PrintOptionName,
  { windows: Capability; cups: Capability }
> {
  const section = README.split("<!-- support-matrix:start -->")[1]?.split(
    "<!-- support-matrix:end -->",
  )[0];

  if (!section) throw new Error("support-matrix markers missing from README");

  const rows = new Map<
    PrintOptionName,
    { windows: Capability; cups: Capability }
  >();

  for (const line of section.split("\n")) {
    const cells = line.split("|").map((cell) => cell.trim());

    // | `option` | Windows | macOS / Linux | Notes |
    const option = cells[1]?.match(/^`(\w+)`$/)?.[1];

    if (!option) continue;

    const windows = LABELS[cells[2]];
    const cups = LABELS[cells[3]];

    if (!windows || !cups) {
      throw new Error(`Unrecognised support level for "${option}" in README`);
    }

    rows.set(option as PrintOptionName, { windows, cups });
  }

  return rows;
}

const matrix = parseSupportMatrix();

it("documents every option the library accepts", () => {
  expect([...matrix.keys()].sort()).toEqual([...PRINT_OPTION_NAMES].sort());
});

it.each(PRINT_OPTION_NAMES)(
  "documents %s to match the Windows driver",
  (option) => {
    expect(matrix.get(option)?.windows).toBe(
      windowsDriver.capabilities[option],
    );
  },
);

it.each(PRINT_OPTION_NAMES)(
  "documents %s to match the CUPS driver",
  (option) => {
    expect(matrix.get(option)?.cups).toBe(cupsDriver.capabilities[option]);
  },
);

it("tells readers what an unsupported option does", () => {
  expect(README).toContain("UnsupportedOptionError");
  expect(README).toContain("{ strict: false }");
});
