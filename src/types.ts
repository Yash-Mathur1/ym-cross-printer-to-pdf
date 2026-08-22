/**
 * Represents a printer device
 */
export type Printer = {
  /** Unique identifier for the printer device */
  deviceId: string;
  /** Human-readable name of the printer */
  name: string;
  /** Array of supported paper sizes */
  paperSizes: string[];
};
