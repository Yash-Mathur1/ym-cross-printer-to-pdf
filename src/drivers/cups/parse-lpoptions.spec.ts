import fs from "fs";
import path from "path";
import {
  parseDefaultDestination,
  parseDescriptions,
  parsePageSizes,
  parseQueueNames,
} from "./parse-lpoptions";

const fixture = (name: string) =>
  fs.readFileSync(
    path.join(__dirname, "..", "..", "__fixtures__", "cups", name),
    "utf8",
  );

describe("parseQueueNames", () => {
  it("reads one queue per line", () => {
    expect(parseQueueNames(fixture("lpstat-e.txt"))).toEqual([
      "HP_LaserJet_Pro",
      "Zebra_ZTC_ZPL",
      "Brother_MFC_L3750CDW",
      "PDF",
    ]);
  });

  it("returns nothing for empty output", () => {
    expect(parseQueueNames("")).toEqual([]);
    expect(parseQueueNames("\n  \n")).toEqual([]);
  });
});

describe("parseDescriptions", () => {
  it("pairs each queue with its description", () => {
    const descriptions = parseDescriptions(fixture("lpstat-l-p.txt"));

    expect(descriptions.get("HP_LaserJet_Pro")).toBe("HP LaserJet Pro M404dn");
    expect(descriptions.get("Zebra_ZTC_ZPL")).toBe(
      "Zebra ZTC ZPL Label Printer",
    );
    expect(descriptions.get("Brother_MFC_L3750CDW")).toBe(
      "Brother MFC-L3750CDW series",
    );
  });

  it("omits a queue whose description is blank", () => {
    expect(parseDescriptions(fixture("lpstat-l-p.txt")).has("PDF")).toBe(false);
  });

  it("does not attribute a description to the wrong queue", () => {
    // Location follows Description, so a naive scan could carry state forward.
    const descriptions = parseDescriptions(fixture("lpstat-l-p.txt"));

    expect(descriptions.size).toBe(3);
  });

  it("returns an empty map for empty output", () => {
    expect(parseDescriptions("").size).toBe(0);
  });
});

describe("parsePageSizes", () => {
  it("reads the media list and strips the default marker", () => {
    expect(parsePageSizes(fixture("lpoptions-l.txt"))).toEqual([
      "Letter",
      "A4",
      "A5",
      "A6",
      "Legal",
      "Executive",
      "Statement",
      "FanFoldGermanLegal",
      "Custom.WIDTHxHEIGHT",
    ]);
  });

  it("is not confused by other option lines", () => {
    expect(parsePageSizes(fixture("lpoptions-l.txt"))).not.toContain("Tray1");
    expect(parsePageSizes(fixture("lpoptions-l.txt"))).not.toContain("Gray");
  });

  it("ignores a PageSize line with no value separator", () => {
    expect(parsePageSizes("PageSize/Media Size")).toEqual([]);
  });

  it("returns nothing when the printer reports no media", () => {
    expect(parsePageSizes("InputSlot/Media Source: *Auto")).toEqual([]);
    expect(parsePageSizes("")).toEqual([]);
  });
});

describe("parseDefaultDestination", () => {
  it("reads the destination name", () => {
    expect(
      parseDefaultDestination("system default destination: HP_LaserJet_Pro"),
    ).toBe("HP_LaserJet_Pro");
  });

  it("returns null when no default is set", () => {
    expect(parseDefaultDestination("no system default destination")).toBeNull();
    expect(parseDefaultDestination("")).toBeNull();
  });

  it("returns null for output with no value separator", () => {
    expect(parseDefaultDestination("unexpected output")).toBeNull();
  });

  it("returns null when the separator is present but the value is blank", () => {
    expect(parseDefaultDestination("system default destination:")).toBeNull();
  });

  it("survives a translated prefix, since only the value is read", () => {
    // The C locale is pinned in cups-exec, but the parser must not depend on
    // the English wording to find the value.
    expect(parseDefaultDestination(fixture("lpstat-d-german.txt"))).toBe(
      "HP_LaserJet_Pro",
    );
  });
});
