/**
 * Parsers for the CUPS command-line tools.
 *
 * Every function here assumes the C locale (see cups-exec), which is what
 * makes the English marker strings below dependable.
 */

/**
 * Queue names from `lpstat -e`, one per line.
 *
 * Preferred over parsing `lpstat -p` because the output carries no prose and
 * so cannot be reworded between CUPS releases.
 */
export function parseQueueNames(stdout: string): string[] {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => !!line);
}

/**
 * Human-readable descriptions from `lpstat -l -p`:
 *
 *     printer HP_LaserJet is idle.  enabled since Mon 01 Jan 2024
 *             Description: HP LaserJet Pro M404
 *             Location: Office
 */
export function parseDescriptions(stdout: string): Map<string, string> {
  const descriptions = new Map<string, string>();
  let current: string | null = null;

  for (const line of stdout.split(/\r?\n/)) {
    const printer = line.match(/^printer\s+(\S+)/);

    if (printer) {
      current = printer[1];
      continue;
    }

    const description = line.match(/^\s+Description:\s*(.*)$/);

    if (description && current) {
      const value = description[1].trim();
      if (value) descriptions.set(current, value);
      current = null;
    }
  }

  return descriptions;
}

/**
 * Supported media from `lpoptions -p NAME -l`:
 *
 *     PageSize/Media Size: *Letter A4 Legal Custom.WIDTHxHEIGHT
 *     InputSlot/Media Source: *Auto Tray1
 *
 * The leading asterisk marks the current default and is not part of the name.
 */
export function parsePageSizes(stdout: string): string[] {
  for (const line of stdout.split(/\r?\n/)) {
    if (!/^PageSize(\/|:)/.test(line.trim())) continue;

    const separator = line.indexOf(":");
    if (separator === -1) continue;

    return line
      .slice(separator + 1)
      .trim()
      .split(/\s+/)
      .map((size) => (size.startsWith("*") ? size.slice(1) : size))
      .filter((size) => !!size);
  }

  return [];
}

/**
 * The default destination from `lpstat -d`:
 *
 *     system default destination: HP_LaserJet
 *     no system default destination
 */
export function parseDefaultDestination(stdout: string): string | null {
  const line = stdout.trim();

  if (!line || /no system default destination/i.test(line)) return null;

  const separator = line.indexOf(":");
  if (separator === -1) return null;

  return line.slice(separator + 1).trim() || null;
}
