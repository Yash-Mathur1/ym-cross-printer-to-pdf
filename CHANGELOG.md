# Changelog

## 1.0.0

First release under the name `@ym1/cross-printer-to-pdf`.

This package is a fork of [pdf-to-printer](https://github.com/artiebits/pdf-to-printer)
at v5.8.0, extended to support macOS and Linux. The upstream history is kept in
[CHANGELOG-upstream.md](CHANGELOG-upstream.md).

### Features

- **macOS and Linux support** via CUPS (`lp`, `lpstat`, `lpoptions`). Windows
  continues to use the bundled SumatraPDF engine. The API is identical on all
  three platforms.
- **Typed errors.** Every failure is an `Error` subclass with a stable `code`:
  `UnsupportedPlatformError`, `MissingDependencyError`, `FileNotFoundError`,
  `InvalidOptionError`, `UnsupportedOptionError`, `PrintError`. Previously some
  failures were thrown as bare strings, leaving `message` undefined.
- **Capability checking.** Options a platform cannot honour raise
  `UnsupportedOptionError` rather than being silently dropped. Pass
  `{ strict: false }` to downgrade this to a warning.
- **Namespaced platform options.** `win32.sumatraPdfPath` replaces the
  top-level `sumatraPdfPath`, which still works but is deprecated.

### Bug fixes

Carried over from the printer-discovery rewrite, which replaced scraped
PowerShell text with `ConvertTo-Json`:

- Printer names containing a colon are no longer truncated at the first colon.
  An IP-style queue name such as `192.168.1.50:9100` previously came back as
  `192.168.1.50` and could never be matched at print time.
- `paperSizes` is no longer capped at four entries. PowerShell's list formatter
  rendered collections as `{A4, Letter, A5, A6...}`, so a printer supporting
  107 media names reported four.
- Printer discovery no longer throws `TypeError: Cannot read properties of
undefined` when the query returns a blank or colon-less line.
- Non-ASCII printer names survive the OEM code page, and the console window no
  longer flashes on discovery in packaged Electron apps.
- Discovery output above 1 MB no longer aborts the call.
