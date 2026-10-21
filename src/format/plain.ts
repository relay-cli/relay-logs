import type {EntryLevel} from '../core/levels.js';
import type {LogEntry} from '../core/entry.js';

export interface PlainFormatOptions {
  /** Color the line by its level. */
  color: boolean;
  /** Prefix each line with its source, as `tail` does when following several files. */
  showSource: boolean;
}

const colors: Record<EntryLevel, string | undefined> = {
  trace: '\u001b[2m',
  debug: '\u001b[2m',
  info: undefined,
  warn: '\u001b[33m',
  error: '\u001b[31m',
  fatal: '\u001b[1;31m',
  unknown: undefined,
};
const reset = '\u001b[0m';

/** Render an entry as one line of plain text, keeping the line as it was written. */
export const formatPlain = (entry: LogEntry, options: PlainFormatOptions): string => {
  const prefix = options.showSource && entry.source !== undefined ? `${entry.source}: ` : '';
  const color = options.color ? colors[entry.level] : undefined;
  return color === undefined ? `${prefix}${entry.raw}` : `${prefix}${color}${entry.raw}${reset}`;
};
