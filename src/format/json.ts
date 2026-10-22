import type {LogEntry} from '../core/entry.js';

/**
 * Render an entry as one JSON object with the fields every log format shares, so mixed text,
 * JSON, and logfmt logs come out in one shape for scripts and other tools.
 */
export const formatJson = (entry: LogEntry): string =>
  JSON.stringify({
    ...(entry.time === undefined ? {} : {time: entry.time}),
    ...(entry.level === 'unknown' ? {} : {level: entry.level}),
    ...(entry.source === undefined ? {} : {source: entry.source}),
    message: entry.message,
  });
