import normalize from "../../options/normalize";
import { PrintOptions } from "../../options/types";
import buildSumatraArgs from "./sumatra-args";

const build = (options: PrintOptions = {}) =>
  buildSumatraArgs("doc.pdf", normalize(options));

it("prints to the default printer silently", () => {
  expect(build()).toEqual(["-print-to-default", "-silent", "doc.pdf"]);
});

it("targets a named printer", () => {
  expect(build({ printer: "Microsoft Print to PDF" })).toEqual([
    "-print-to",
    "Microsoft Print to PDF",
    "-silent",
    "doc.pdf",
  ]);
});

it("drops -silent when silent is explicitly false", () => {
  expect(build({ silent: false })).toEqual(["-print-to-default", "doc.pdf"]);
});

it("ignores the printer when the dialog is requested", () => {
  expect(build({ printer: "Zebra", printDialog: true })).toEqual([
    "-print-dialog",
    "doc.pdf",
  ]);
});

it("emits print settings in a stable order", () => {
  expect(
    build({
      printer: "Zebra",
      pages: "1-3,5",
      subset: "odd",
      scale: "fit",
      bin: "2",
      paperSize: "A2",
    }),
  ).toEqual([
    "-print-to",
    "Zebra",
    "-silent",
    "-print-settings",
    "1-3,5,odd,fit,bin=2,paper=A2",
    "doc.pdf",
  ]);
});

it("distinguishes monochrome from colour from unset", () => {
  expect(build({ monochrome: true })).toContain("monochrome");
  expect(build({ monochrome: false })).toContain("color");
  expect(build()).not.toContain("-print-settings");
});

it("maps the remaining settings to Sumatra's spellings", () => {
  const settings = (options: PrintOptions) => {
    const args = build(options);
    return args[args.indexOf("-print-settings") + 1];
  };

  expect(settings({ copies: 3 })).toBe("3x");
  expect(settings({ paperKind: 9 })).toBe("paperkind=9");
  expect(settings({ bin: "tray2" })).toBe("bin=tray2");
  expect(settings({ paperSize: "A4" })).toBe("paper=A4");
  expect(settings({ orientation: "landscape" })).toBe("landscape");
  expect(settings({ side: "duplexshort" })).toBe("duplexshort");
});

it("puts the document last so it is never read as a flag value", () => {
  expect(build({ printer: "Zebra", copies: 2 }).slice(-1)).toEqual(["doc.pdf"]);
});
