import normalize from "./normalize";
import { PrintOptions } from "./types";

it("defaults silent on, dialog off and strict on", () => {
  expect(normalize()).toMatchObject({
    silent: true,
    printDialog: false,
    strict: true,
  });
});

it("keeps silent on for anything but an explicit false", () => {
  expect(normalize({ silent: true }).silent).toBe(true);
  expect(normalize({ silent: undefined }).silent).toBe(true);
  expect(normalize({ silent: false }).silent).toBe(false);
});

it("treats printDialog as opt-in", () => {
  expect(normalize({ printDialog: false }).printDialog).toBe(false);
  expect(normalize({ printDialog: true }).printDialog).toBe(true);
});

describe("validation", () => {
  const cases: [keyof PrintOptions, string][] = [
    ["subset", "Invalid subset provided. Valid names: odd, even"],
    [
      "orientation",
      "Invalid orientation provided. Valid names: portrait, landscape",
    ],
    ["scale", "Invalid scale provided. Valid names: noscale, shrink, fit"],
    [
      "side",
      "Invalid side provided. Valid names: duplex, duplexshort, duplexlong, simplex",
    ],
  ];

  it.each(cases)(
    "rejects an invalid %s with the documented message",
    (option, message) => {
      expect(() => normalize({ [option]: "foo" } as PrintOptions)).toThrow(
        message,
      );
    },
  );

  it.each(cases)("accepts %s when omitted", (option) => {
    expect(() =>
      normalize({ [option]: undefined } as PrintOptions),
    ).not.toThrow();
  });

  it("validates before a driver is involved, so it fails the same everywhere", () => {
    expect(() => normalize({ side: "foo" } as PrintOptions)).toThrow(
      /Invalid side/,
    );
  });
});

describe("sumatraPdfPath", () => {
  it("accepts the deprecated top-level form", () => {
    expect(normalize({ sumatraPdfPath: "a.exe" }).win32.sumatraPdfPath).toBe(
      "a.exe",
    );
  });

  it("prefers the namespaced form when both are given", () => {
    expect(
      normalize({
        sumatraPdfPath: "old.exe",
        win32: { sumatraPdfPath: "new.exe" },
      }).win32.sumatraPdfPath,
    ).toBe("new.exe");
  });

  it("is undefined when neither is given", () => {
    expect(normalize().win32.sumatraPdfPath).toBeUndefined();
  });
});

describe("provided", () => {
  it("lists only options the caller actually set", () => {
    expect(normalize({ printer: "Zebra", copies: 2 }).provided).toEqual([
      "printer",
      "copies",
    ]);
  });

  it("does not report defaulted options as provided", () => {
    expect(normalize().provided).toEqual([]);
  });

  it("reports an explicit false as provided", () => {
    expect(normalize({ monochrome: false }).provided).toContain("monochrome");
  });

  it("does not treat sumatraPdfPath as a job option", () => {
    // It configures the backend rather than describing the job, so it must not
    // make CUPS reject cross-platform code that sets it.
    expect(normalize({ sumatraPdfPath: "a.exe" }).provided).toEqual([]);
    expect(normalize({ win32: { sumatraPdfPath: "a.exe" } }).provided).toEqual(
      [],
    );
  });

  it("does not treat strict or win32 as job options", () => {
    expect(normalize({ strict: false, win32: {} }).provided).toEqual([]);
  });
});
