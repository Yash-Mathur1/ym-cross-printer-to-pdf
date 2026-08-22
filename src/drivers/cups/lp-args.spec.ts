import path from "path";
import normalize from "../../options/normalize";
import { PrintOptions } from "../../options/types";
import buildLpArgs, { parseJobId } from "./lp-args";

const build = (options: PrintOptions = {}) =>
  buildLpArgs("doc.pdf", normalize(options));

/** The -o values, in order. */
const printOptions = (options: PrintOptions = {}) => {
  const args = build(options);
  return args.filter((_, i) => args[i - 1] === "-o");
};

it("prints to the default destination with no options", () => {
  expect(build()).toEqual([path.resolve("doc.pdf")]);
});

it("targets a named destination", () => {
  expect(build({ printer: "HP_LaserJet" }).slice(0, 2)).toEqual([
    "-d",
    "HP_LaserJet",
  ]);
});

it("passes copies as -n, not as a print option", () => {
  expect(build({ copies: 3 })).toContain("-n");
  expect(build({ copies: 3 })).toContain("3");
  expect(printOptions({ copies: 3 })).toEqual([]);
});

it("resolves the document to an absolute path", () => {
  // lp has no "--" terminator, so a relative name starting with a dash would
  // be parsed as a flag.
  const args = buildLpArgs("-weird-name.pdf", normalize());

  expect(path.isAbsolute(args[args.length - 1])).toBe(true);
  expect(args[args.length - 1].startsWith("-")).toBe(false);
});

it("puts the document last", () => {
  expect(
    build({ printer: "HP", copies: 2, paperSize: "A4" }).slice(-1),
  ).toEqual([path.resolve("doc.pdf")]);
});

describe("IPP attribute mapping", () => {
  it("maps pages and subset", () => {
    expect(printOptions({ pages: "1-3,5" })).toEqual(["page-ranges=1-3,5"]);
    expect(printOptions({ subset: "odd" })).toEqual(["page-set=odd"]);
  });

  it("maps orientation to its IPP enum", () => {
    expect(printOptions({ orientation: "portrait" })).toEqual([
      "orientation-requested=3",
    ]);
    expect(printOptions({ orientation: "landscape" })).toEqual([
      "orientation-requested=4",
    ]);
  });

  it("distinguishes monochrome, colour and unset", () => {
    expect(printOptions({ monochrome: true })).toEqual([
      "print-color-mode=monochrome",
    ]);
    expect(printOptions({ monochrome: false })).toEqual([
      "print-color-mode=color",
    ]);
    expect(printOptions({})).toEqual([]);
  });

  it("maps Sumatra's duplex vocabulary onto IPP sides", () => {
    expect(printOptions({ side: "duplex" })).toEqual([
      "sides=two-sided-long-edge",
    ]);
    expect(printOptions({ side: "duplexlong" })).toEqual([
      "sides=two-sided-long-edge",
    ]);
    expect(printOptions({ side: "duplexshort" })).toEqual([
      "sides=two-sided-short-edge",
    ]);
    expect(printOptions({ side: "simplex" })).toEqual(["sides=one-sided"]);
  });

  it("maps paper size to media", () => {
    expect(printOptions({ paperSize: "A4" })).toEqual(["media=A4"]);
  });

  it("approximates scale, treating shrink as fit-to-page", () => {
    expect(printOptions({ scale: "fit" })).toEqual(["fit-to-page"]);
    expect(printOptions({ scale: "shrink" })).toEqual(["fit-to-page"]);
    expect(printOptions({ scale: "noscale" })).toEqual(["scaling=100"]);
  });

  it("passes bin through as a PPD InputSlot keyword", () => {
    expect(printOptions({ bin: "Tray2" })).toEqual(["InputSlot=Tray2"]);
  });

  it("combines multiple options", () => {
    expect(
      printOptions({ pages: "1-3", side: "duplex", paperSize: "A4" }),
    ).toEqual(["page-ranges=1-3", "sides=two-sided-long-edge", "media=A4"]);
  });
});

describe("parseJobId", () => {
  it("reads the id from lp's acknowledgement", () => {
    expect(parseJobId("request id is HP_LaserJet-42 (1 file(s))")).toBe(
      "HP_LaserJet-42",
    );
  });

  it("returns undefined when lp said something else", () => {
    expect(parseJobId("")).toBeUndefined();
  });
});
