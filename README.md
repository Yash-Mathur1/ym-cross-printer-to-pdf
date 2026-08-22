# @ym1/cross-printer-to-pdf

[![CI](https://github.com/Yash-Mathur1/ym-cross-printer-to-pdf/actions/workflows/ci.yml/badge.svg)](https://github.com/Yash-Mathur1/ym-cross-printer-to-pdf/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Print PDF files and images from Node.js or Electron on **Windows, macOS and Linux**, with one API. Works with office printers, label printers (Zebra, Rollo), and network printers alike.

## How it works

| Platform          | Backend               | Bundled?                       |
| ----------------- | --------------------- | ------------------------------ |
| Windows           | SumatraPDF            | Yes — no installation needed   |
| macOS             | CUPS (`lp`, `lpstat`) | Ships with macOS               |
| Linux, BSD, SunOS | CUPS (`lp`, `lpstat`) | Requires the CUPS client tools |

The platform backend is selected per call, so importing this package on an unsupported platform never throws at import time.

## Requirements

- Node.js 18 or later
- **Linux only:** the CUPS client tools.

  ```bash
  sudo apt install cups-client    # Debian / Ubuntu
  sudo dnf install cups-client    # Fedora / RHEL
  ```

  If they are missing you get a `MissingDependencyError` naming the package to install, not an opaque spawn failure.

> **WSL is not supported.** It reports itself as Linux but has no print stack by default. Print from the Windows host instead.

## Installation

This package is not published to the public npm registry. Install it straight from GitHub:

```bash
npm install github:Yash-Mathur1/ym-cross-printer-to-pdf
```

Pin a tag or commit for reproducible builds:

```bash
npm install github:Yash-Mathur1/ym-cross-printer-to-pdf#v1.0.0
```

The package builds itself on install via the `prepare` script, so no committed build artifacts are needed.

## Quick start

```typescript
import {
  print,
  getPrinters,
  getDefaultPrinter,
} from "@ym1/cross-printer-to-pdf";

// Print to the default printer
await print("document.pdf");

// Print with options — identical on every platform
await print("document.pdf", {
  printer: "HP LaserJet",
  pages: "1-3",
  copies: 2,
  paperSize: "A4",
});

const printers = await getPrinters();
const fallback = await getDefaultPrinter();
```

### Shipping labels

```typescript
await print("label.pdf", {
  printer: "Zebra_ZTC_ZPL",
  paperSize: "4x6",
  scale: "noscale",
});
```

### Invoices from a server

```typescript
await print("invoice.pdf", {
  printer: "Office HP LaserJet",
  copies: 2,
  side: "duplex",
});
```

### Electron

Paths inside `.asar` archives are rewritten to `.asar.unpacked` automatically, since packed files cannot be executed. Make sure your packager unpacks the bundled binary:

```json
{
  "build": {
    "asarUnpack": ["**/node_modules/@ym1/cross-printer-to-pdf/dist/**"]
  }
}
```

## Option support by platform

Not every option exists on both backends. Options marked **None** raise `UnsupportedOptionError` rather than being silently dropped — a label printed without its requested `paperSize` wastes physical stock. Pass `{ strict: false }` to downgrade that to a warning.

<!-- support-matrix:start -->

| Option        | Windows | macOS / Linux | Notes                                                                            |
| ------------- | ------- | ------------- | -------------------------------------------------------------------------------- |
| `printer`     | Full    | Full          | Windows printer name, or CUPS queue name.                                        |
| `pages`       | Full    | Full          | For example `"1-3,5"`.                                                           |
| `subset`      | Full    | Full          | `"odd"` or `"even"`.                                                             |
| `orientation` | Full    | Full          | `"portrait"` or `"landscape"`.                                                   |
| `monochrome`  | Full    | Full          | `false` forces colour explicitly.                                                |
| `side`        | Full    | Full          | Bare `"duplex"` means long-edge on both platforms.                               |
| `paperSize`   | Full    | Full          | Names are driver-specific; see `paperSizes` from `getPrinters()`.                |
| `copies`      | Full    | Full          | Defaults to 1.                                                                   |
| `scale`       | Full    | Partial       | CUPS has no one-way shrink, so `"shrink"` behaves as `"fit"` and may enlarge.    |
| `bin`         | Full    | Partial       | Windows tray numbers and CUPS `InputSlot` keywords share no namespace.           |
| `silent`      | Full    | Partial       | `lp` never prompts, so `silent: true` is honoured but `silent: false` cannot be. |
| `paperKind`   | Full    | None          | A Windows `DMPAPER_*` value with no CUPS equivalent.                             |
| `printDialog` | Full    | None          | CUPS printing is headless.                                                       |

<!-- support-matrix:end -->

This table is verified against the drivers' capability tables by a test, so it cannot drift from the code.

## API

### `print(pdf, options?)`

Prints a PDF to a printer. Returns `Promise<void>`.

| Option           | Type                                                     | Description                                         |
| ---------------- | -------------------------------------------------------- | --------------------------------------------------- |
| `printer`        | `string`                                                 | Printer to use. Defaults to the system default.     |
| `pages`          | `string`                                                 | Pages to print, for example `"1-3,5"`.              |
| `subset`         | `"odd" \| "even"`                                        | Print only odd or even pages.                       |
| `orientation`    | `"portrait" \| "landscape"`                              | Page orientation.                                   |
| `scale`          | `"noscale" \| "shrink" \| "fit"`                         | Content scaling.                                    |
| `monochrome`     | `boolean`                                                | Print in black and white.                           |
| `side`           | `"duplex" \| "duplexshort" \| "duplexlong" \| "simplex"` | Duplex mode.                                        |
| `bin`            | `string`                                                 | Paper tray.                                         |
| `paperSize`      | `string`                                                 | Paper size, for example `"A4"`.                     |
| `paperKind`      | `number`                                                 | Windows paper kind. Windows only.                   |
| `copies`         | `number`                                                 | Number of copies.                                   |
| `silent`         | `boolean`                                                | Suppress backend error dialogs. Defaults to `true`. |
| `printDialog`    | `boolean`                                                | Show the print dialog. Windows only.                |
| `strict`         | `boolean`                                                | Throw on unsupported options. Defaults to `true`.   |
| `win32`          | `{ sumatraPdfPath?: string }`                            | Windows-only settings. Ignored elsewhere.           |
| `sumatraPdfPath` | `string`                                                 | **Deprecated.** Use `win32.sumatraPdfPath`.         |

### `getPrinters()`

Returns `Promise<Printer[]>` — every printer or CUPS queue on the system.

```typescript
[
  {
    deviceId: "HP_LaserJet",
    name: "HP LaserJet Pro M404dn",
    paperSizes: ["A4", "Letter"],
  },
];
```

`deviceId` is the addressable name to pass as `printer`; `name` is the human-readable description.

### `getDefaultPrinter()`

Returns `Promise<Printer | null>`. On CUPS the default is resolved from `LPDEST`, then `PRINTER`, then `lpstat -d` — the same order `lp` itself uses.

## Errors

Every failure is an `Error` subclass carrying a stable `code`. Branch on `code` or `instanceof`, never on the message.

| Class                      | `code`         | Raised when                                               |
| -------------------------- | -------------- | --------------------------------------------------------- |
| `UnsupportedPlatformError` | `EPLATFORM`    | The platform has no printing backend.                     |
| `MissingDependencyError`   | `EDEPENDENCY`  | `lp` is not installed. Carries an install hint.           |
| `FileNotFoundError`        | `ENOFILE`      | The document is missing or was not specified.             |
| `InvalidOptionError`       | `EOPTION`      | An option value is outside its allowed set.               |
| `UnsupportedOptionError`   | `EUNSUPPORTED` | The platform cannot honour a valid option.                |
| `PrintError`               | `EPRINT`       | The backend ran and failed. Carries `exitCode`, `stderr`. |

All of them extend `PdfToPrinterError`.

```typescript
import { print, PrintError } from "@ym1/cross-printer-to-pdf";

try {
  await print("invoice.pdf", { printer: "Nope" });
} catch (error) {
  if (error instanceof PrintError) console.error(error.stderr);
}
```

## Migrating from `pdf-to-printer`

The API is source-compatible; these are the behavioural differences:

- **macOS and Linux now print** instead of throwing `"Operating System not supported"`.
- **Rejections are `Error` subclasses**, not bare strings. Code matching on the thrown string must switch to `error.code === "EPLATFORM"`.
- **`paperSizes` is no longer capped at four entries**, and printer names containing a colon are no longer truncated.
- **Unsupported options throw** on platforms that cannot honour them. Pass `{ strict: false }` for the old silent behaviour.
- **`sumatraPdfPath` is deprecated** in favour of `win32.sumatraPdfPath`. It still works.

## Credits

A fork of [pdf-to-printer](https://github.com/artiebits/pdf-to-printer) by [artiebits](https://github.com/artiebits), extended for macOS and Linux. Windows printing uses [SumatraPDF](https://www.sumatrapdfreader.org/), which is bundled with this package.

## License

[MIT](LICENSE) — © 2019 artiebits, © 2026 Yash-Mathur1
