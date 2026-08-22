import path from "path";
import fixPathForAsarUnpack from "../../utils/electron-util";

export const SUMATRA_BINARY = "SumatraPDF-3.4.6-32.exe";

/**
 * Locates the SumatraPDF executable.
 *
 * A caller-supplied path is trusted as-is; the bundled binary sits beside the
 * compiled bundle and is rewritten out of an Electron ASAR archive, which
 * cannot execute packed files.
 */
export default function resolveSumatraPath(override?: string): string {
  if (override) return override;

  return fixPathForAsarUnpack(path.join(__dirname, SUMATRA_BINARY));
}
