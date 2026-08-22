import fs from "fs";
import os from "os";
import path from "path";
import getPrinters from "../../get-printers/get-printers";
import getDefaultPrinter from "../../get-default-printer/get-default-printer";
import print from "../../print/print";

/**
 * Exercises the real CUPS binaries rather than mocks.
 *
 * Unit tests prove we build the argv we intend to; only this proves that CUPS
 * accepts it. `lp` exits non-zero on an unknown option name or an invalid
 * value, so a job it accepts is real validation of the mapping.
 *
 * Skipped unless RUN_CUPS_INTEGRATION is set, because it needs a configured
 * print system. CI sets it for the Linux and macOS integration jobs.
 */
const enabled = !!process.env.RUN_CUPS_INTEGRATION && os.platform() !== "win32";
const describeCups = enabled ? describe : describe.skip;

/** A printable queue, if CI configured one. */
const queue = process.env.INTEGRATION_PRINTER;
const itPrints = queue ? it : it.skip;

/**
 * Builds a minimal single-page PDF with a correct cross-reference table, so
 * the CUPS filter chain accepts it rather than rejecting a malformed file.
 */
function writeSamplePdf(): string {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R >>",
    "<< /Length 0 >>\nstream\nendstream",
  ];

  let body = "%PDF-1.4\n";
  const offsets: number[] = [];

  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const startxref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  body +=
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n` +
    `startxref\n${startxref}\n%%EOF\n`;

  const file = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "cross-printer-")),
    "sample.pdf",
  );
  fs.writeFileSync(file, body, "latin1");

  return file;
}

describeCups("against the real CUPS tools", () => {
  jest.setTimeout(60_000);

  it("lists printers without throwing", async () => {
    const printers = await getPrinters();

    expect(Array.isArray(printers)).toBe(true);

    for (const printer of printers) {
      expect(printer.deviceId).toBeTruthy();
      expect(printer.name).toBeTruthy();
      expect(Array.isArray(printer.paperSizes)).toBe(true);
    }
  });

  it("resolves a default printer, or null when there is none", async () => {
    const printer = await getDefaultPrinter();

    if (printer !== null) {
      expect(printer.deviceId).toBeTruthy();
      expect(Array.isArray(printer.paperSizes)).toBe(true);
    }
  });

  it("finds the queue CI configured", async () => {
    if (!queue) return;

    const printers = await getPrinters();

    expect(printers.map((printer) => printer.deviceId)).toContain(queue);
  });

  itPrints("submits a job that CUPS accepts", async () => {
    await expect(
      print(writeSamplePdf(), { printer: queue }),
    ).resolves.toBeUndefined();
  });

  itPrints("submits a job carrying the full option mapping", async () => {
    // Every one of these becomes an -o attribute. lp rejects an unknown name
    // or an out-of-range value, so acceptance validates the whole mapping.
    await expect(
      print(writeSamplePdf(), {
        printer: queue,
        copies: 1,
        pages: "1",
        subset: "odd",
        orientation: "landscape",
        monochrome: true,
        side: "simplex",
        paperSize: "A4",
        scale: "fit",
      }),
    ).resolves.toBeUndefined();
  });

  itPrints("reports a rejected job as a PrintError", async () => {
    const error = await print(writeSamplePdf(), {
      printer: "queue-that-does-not-exist",
    }).catch((e) => e);

    expect(error).toMatchObject({ code: "EPRINT" });
  });
});
