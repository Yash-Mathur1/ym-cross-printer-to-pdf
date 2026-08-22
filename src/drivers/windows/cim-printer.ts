import { Printer } from "../../types";

/**
 * Shape of a Win32_Printer row as serialized by ConvertTo-Json.
 * Every field is optional: CIM populates only what the provider reports.
 */
export type Win32Printer = {
  DeviceID?: string | null;
  Name?: string | null;
  PrinterPaperNames?: string[] | string | null;
};

const SELECT = "Select-Object DeviceID,Name,PrinterPaperNames";

/**
 * `-InputObject @(...)` keeps the array wrapper that a bare pipeline would drop
 * on a single-printer host, where ConvertTo-Json emits an object instead.
 */
function toJsonQuery(filter?: string): string {
  const filterArg = filter ? ` -Filter '${filter}'` : "";

  return (
    `ConvertTo-Json -Depth 3 -Compress -InputObject ` +
    `@(Get-CimInstance -ClassName Win32_Printer${filterArg} | ${SELECT})`
  );
}

export const PRINTERS_QUERY = toJsonQuery();

export const DEFAULT_PRINTER_QUERY = toJsonQuery("Default = TRUE");

/**
 * Normalizes one CIM row into a Printer, or null when the row lacks the
 * identity fields that make it addressable at print time.
 */
export function toPrinter(
  raw: Win32Printer | null | undefined,
): Printer | null {
  if (!raw) return null;

  const deviceId = typeof raw.DeviceID === "string" ? raw.DeviceID.trim() : "";
  const name = typeof raw.Name === "string" ? raw.Name.trim() : "";

  if (!deviceId || !name) return null;

  return { deviceId, name, paperSizes: toPaperSizes(raw.PrinterPaperNames) };
}

/**
 * A provider reporting exactly one media name yields a bare string rather than
 * a single-element array.
 */
function toPaperSizes(value: Win32Printer["PrinterPaperNames"]): string[] {
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (!Array.isArray(value)) return [];

  return value
    .filter((size): size is string => typeof size === "string")
    .map((size) => size.trim())
    .filter((size) => !!size);
}

/**
 * ConvertTo-Json still collapses an empty array to `null`, and a defensive
 * unwrap costs nothing if a future edit drops the -InputObject wrapper.
 */
export function toPrinters(parsed: unknown): Printer[] {
  if (parsed === null || parsed === undefined) return [];

  const rows = Array.isArray(parsed) ? parsed : [parsed];

  return rows
    .map((row) => toPrinter(row as Win32Printer))
    .filter((printer): printer is Printer => printer !== null);
}
