import type {LogEntry} from '../core/entry.js';
import {logHowlSchema} from '../core/log-howl.js';

/**
 * Render an entry as a line Relay Cards (github.com/relay-cli/relay-cards) turns into the
 * matching card: errors and fatal entries become error cards that collect the stack frames
 * printed after them, warnings become warning cards, and JSON records become JSON cards.
 * Log Howl alerts are written as text so the rule name stays in view. The time and source go
 * in a leading bracket, which Relay Cards accepts before a level.
 */
export const formatCards = (entry: LogEntry): string => {
  // Stack frames and other continuation lines pass through so they attach to the error above.
  if (entry.level === 'unknown' && /^\s/.test(entry.raw)) return entry.raw;
  const tag = [entry.time, entry.source]
    .filter((part) => part !== undefined)
    .join(' ')
    .replaceAll(']', ')');
  const prefix = tag === '' ? '' : `[${tag}] `;
  const record = entry.fields !== undefined && entry.fields.schema !== logHowlSchema;
  switch (entry.level) {
    case 'fatal':
    case 'error':
    case 'warn':
      return `${prefix}${entry.level.toUpperCase()}: ${entry.message}`;
    case 'unknown':
      return record ? entry.raw : `${prefix}${entry.raw}`;
    default:
      return record ? entry.raw : `${prefix}${entry.level.toUpperCase()} ${entry.message}`;
  }
};
