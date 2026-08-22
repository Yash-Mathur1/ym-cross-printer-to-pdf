# Third-party notices

This package has **no runtime npm dependencies**, but it distributes one
third-party binary and calls two others that it does not distribute.

---

## SumatraPDF — bundled, GPLv3

`dist/SumatraPDF-3.4.6-32.exe` is redistributed with this package and is used
as the Windows printing engine.

|           |                                                                    |
| --------- | ------------------------------------------------------------------ |
| Project   | SumatraPDF                                                         |
| Version   | 3.4.6 (32-bit)                                                     |
| Author    | Krzysztof Kowalczyk and contributors                               |
| Copyright | Copyright 2006-2022 all authors                                    |
| License   | **GPL-3.0** (some components BSD — see the project's `AUTHORS`)    |
| Homepage  | https://www.sumatrapdfreader.org/                                  |
| Source    | https://github.com/sumatrapdfreader/sumatrapdf                     |
| SHA-256   | `0b359fe7df53dada3ab823d7735ca048232ec05f0d14120938c7b020cb051b16` |

The full licence text is included at [`licenses/GPL-3.0.txt`](licenses/GPL-3.0.txt).

### Written offer for source code

In accordance with GPL-3.0 section 6, the complete corresponding source code
for the SumatraPDF version distributed here is publicly available at:

> https://github.com/sumatrapdfreader/sumatrapdf/releases/tag/3.4.6

### What this means for software that uses this package

SumatraPDF is invoked as a **separate process over a command line**. It is not
linked into your application, and no SumatraPDF code is compiled into it. On
the ordinary reading of the GPL, that arm's-length invocation does not make
your application a derivative work, so your own code keeps whatever licence you
choose for it.

The obligation that _does_ apply is one of **distribution**: anyone who ships a
copy of `SumatraPDF-3.4.6-32.exe` — including by shipping this package inside an
installer, a container image, or an Electron bundle — is conveying a GPL-3.0
program and must pass on the licence text and the source offer above.

If you would rather not carry that obligation, do not ship the binary. This
package supports pointing at an externally installed copy instead:

```typescript
await print("document.pdf", {
  win32: { sumatraPdfPath: "C:/Program Files/SumatraPDF/SumatraPDF.exe" },
});
```

With that option set the bundled executable is never used, and you can exclude
it from whatever you distribute.

This section is a practical summary, not legal advice. If you are selling or
redistributing a product built on this package, have a lawyer confirm your
obligations.

---

## CUPS command-line tools — invoked, not distributed

On macOS, Linux and BSD this package runs `lp`, `lpstat` and `lpoptions`. These
ship with the operating system or are installed by the user through their
package manager. **Nothing from CUPS is redistributed here**, so no CUPS licence
obligation attaches to this package.

|          |                                      |
| -------- | ------------------------------------ |
| Project  | CUPS                                 |
| License  | Apache-2.0 (CUPS 2.x and later)      |
| Homepage | https://openprinting.github.io/cups/ |

---

## This package

Everything else in this repository is MIT licensed. See [`LICENSE`](LICENSE).
It is a fork of [pdf-to-printer](https://github.com/artiebits/pdf-to-printer),
whose copyright notice is retained there as MIT requires.
