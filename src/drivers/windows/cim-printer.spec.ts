import {
  DEFAULT_PRINTER_QUERY,
  PRINTERS_QUERY,
  toPrinter,
  toPrinters,
} from "./cim-printer";

describe("query construction", () => {
  it("wraps results in an array so a single-printer host still yields a list", () => {
    expect(PRINTERS_QUERY).toContain("-InputObject @(Get-CimInstance");
    expect(PRINTERS_QUERY).toContain("ConvertTo-Json");
  });

  it("filters on Default for the default-printer query only", () => {
    expect(DEFAULT_PRINTER_QUERY).toContain("-Filter 'Default = TRUE'");
    expect(PRINTERS_QUERY).not.toContain("-Filter");
  });

  it("does not ask for properties it will not map", () => {
    expect(PRINTERS_QUERY).toContain(
      "Select-Object DeviceID,Name,PrinterPaperNames",
    );
  });
});

describe("regressions against the text-scraping parser", () => {
  it("keeps a printer name containing a colon intact", () => {
    // The old parser split on ":" and destructured [label, value], so an
    // IP-style queue name was truncated at the first colon and could never
    // be matched at print time.
    expect(
      toPrinter({
        DeviceID: "192.168.1.50:9100",
        Name: "Zebra ZTC 192.168.1.50:9100",
        PrinterPaperNames: ["4x6"],
      }),
    ).toStrictEqual({
      deviceId: "192.168.1.50:9100",
      name: "Zebra ZTC 192.168.1.50:9100",
      paperSizes: ["4x6"],
    });
  });

  it("does not cap paperSizes at four entries", () => {
    // PowerShell's list formatter rendered collections as "{A4, A5, A6, A7...}",
    // so the old parser could never see more than four media names.
    const paperSizes = Array.from({ length: 30 }, (_, i) => `Size-${i + 1}`);

    expect(
      toPrinter({ DeviceID: "hp", Name: "HP", PrinterPaperNames: paperSizes })
        ?.paperSizes,
    ).toHaveLength(30);
  });

  it("returns an empty list instead of throwing on empty output", () => {
    // The old parser dereferenced an undefined match result and threw
    // "Cannot read properties of undefined (reading 'match')".
    expect(() => toPrinters(null)).not.toThrow();
    expect(toPrinters(null)).toEqual([]);
    expect(toPrinters(undefined)).toEqual([]);
    expect(toPrinters([])).toEqual([]);
  });

  it("preserves non-ASCII printer names", () => {
    expect(
      toPrinter({ DeviceID: "drucker", Name: "Büro Drucker Süd" }),
    ).toEqual({
      deviceId: "drucker",
      name: "Büro Drucker Süd",
      paperSizes: [],
    });
  });
});

describe("toPrinter", () => {
  it("rejects rows without both DeviceID and Name", () => {
    expect(toPrinter({ DeviceID: "only-id" })).toBeNull();
    expect(toPrinter({ Name: "only-name" })).toBeNull();
    expect(toPrinter({ DeviceID: "  ", Name: "  " })).toBeNull();
    expect(toPrinter(null)).toBeNull();
    expect(toPrinter(undefined)).toBeNull();
  });

  it("trims surrounding whitespace", () => {
    expect(toPrinter({ DeviceID: " hp ", Name: " HP " })).toStrictEqual({
      deviceId: "hp",
      name: "HP",
      paperSizes: [],
    });
  });

  it("normalizes a lone media name reported as a bare string", () => {
    expect(
      toPrinter({ DeviceID: "zebra", Name: "Zebra", PrinterPaperNames: "4x6" })
        ?.paperSizes,
    ).toEqual(["4x6"]);
  });

  it("treats a blank media string as no media at all", () => {
    expect(
      toPrinter({ DeviceID: "zebra", Name: "Zebra", PrinterPaperNames: "   " })
        ?.paperSizes,
    ).toEqual([]);
  });

  it("drops null and non-string entries from the media list", () => {
    expect(
      toPrinter({
        DeviceID: "hp",
        Name: "HP",
        // A provider can report ragged data; it must not become "null" strings.
        PrinterPaperNames: ["A4", null, "", "  ", "Letter"] as never,
      })?.paperSizes,
    ).toEqual(["A4", "Letter"]);
  });
});

describe("toPrinters", () => {
  it("accepts a bare object, as ConvertTo-Json emits for a single row", () => {
    expect(toPrinters({ DeviceID: "hp", Name: "HP" })).toStrictEqual([
      { deviceId: "hp", name: "HP", paperSizes: [] },
    ]);
  });

  it("filters invalid rows out of a mixed list", () => {
    expect(
      toPrinters([{ DeviceID: "hp", Name: "HP" }, { Name: "orphan" }]),
    ).toStrictEqual([{ deviceId: "hp", name: "HP", paperSizes: [] }]);
  });
});
