import {type EntryLevel, parseLevelName, parseLevelNumber} from './levels.js';
import {readLogHowlAlert} from './log-howl.js';
import {sanitizeLine} from './sanitize.js';

export interface LogEntry {
  /** Position of the entry in the viewer, starting at 1. */
  seq: number;
  /** Where the line came from, such as a file name. Absent for standard input. */
  source?: string;
  /** The sanitized line as it was read. */
  raw: string;
  level: EntryLevel;
  /** The line without its leading timestamp and level, or a structured record's message. */
  message: string;
  /** The timestamp as written in the line, when one was found. */
  time?: string;
  /** Fields of a JSON record. */
  fields?: Readonly<Record<string, unknown>>;
}

export interface ParseContext {
  seq: number;
  source?: string;
}

const levelKeys = ['level', 'lvl', 'severity', 'levelname', 'log.level'];
const messageKeys = ['msg', 'message', 'event'];
const timeKeys = ['time', 'timestamp', 'ts', '@timestamp', 'datetime'];

const leadingTime =
  /^\[?(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\]?\s*/;
const leadingClock = /^\[?(\d{2}:\d{2}:\d{2}(?:[.,]\d+)?)\]?\s*/;
const levelToken = /^(?:\[([A-Za-z]+)\]|\(([A-Za-z]+)\)|<([A-Za-z]+)>|([A-Z]{3,9})\b:?)\s*/;
const logfmtLevel = /(?:^|\s)(?:level|lvl|severity)=("?)([A-Za-z]+)\1(?=\s|$)/;
const logfmtMessage = /(?:^|\s)msg=(?:"((?:[^"\\]|\\.)*)"|(\S+))/;

/** Recognize the level, timestamp, and message of one log line. */
export const parseLine = (line: string, context: ParseContext): LogEntry => {
  const raw = sanitizeLine(line);
  const base = {
    seq: context.seq,
    raw,
    ...(context.source === undefined ? {} : {source: context.source}),
  };
  const parsed = parseJson(raw) ?? parseLogfmt(raw) ?? parseText(raw);
  const alert = parsed.fields === undefined ? undefined : readLogHowlAlert(parsed.fields);
  if (alert === undefined) return {...base, ...parsed};
  return {
    ...base,
    ...parsed,
    level: alert.level,
    message: alert.message,
    ...(context.source === undefined && alert.source !== undefined ? {source: alert.source} : {}),
  };
};

type Parsed = Pick<LogEntry, 'level' | 'message' | 'time' | 'fields'>;

const parseJson = (raw: string): Parsed | undefined => {
  const text = raw.trim();
  if (!text.startsWith('{') || !text.endsWith('}')) return undefined;
  let record: unknown;
  try {
    record = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (typeof record !== 'object' || record === null || Array.isArray(record)) return undefined;
  const fields = record as Record<string, unknown>;
  const levelValue = pick(fields, levelKeys);
  const level =
    typeof levelValue === 'string'
      ? parseLevelName(levelValue)
      : typeof levelValue === 'number'
        ? parseLevelNumber(levelValue)
        : undefined;
  const message = pick(fields, messageKeys);
  const time = pick(fields, timeKeys);
  return {
    level: level ?? 'unknown',
    message: typeof message === 'string' ? sanitizeLine(message) : text,
    ...(typeof time === 'string' || typeof time === 'number' ? {time: formatTime(time)} : {}),
    fields,
  };
};

const parseLogfmt = (raw: string): Parsed | undefined => {
  const levelMatch = logfmtLevel.exec(raw);
  const level = levelMatch?.[2] === undefined ? undefined : parseLevelName(levelMatch[2]);
  if (level === undefined) return undefined;
  const messageMatch = logfmtMessage.exec(raw);
  const message = messageMatch?.[1]?.replace(/\\(.)/g, '$1') ?? messageMatch?.[2] ?? raw;
  const time = /(?:^|\s)(?:time|ts|t)=("?)(\S+?)\1(?=\s|$)/.exec(raw)?.[2];
  return {level, message, ...(time === undefined ? {} : {time})};
};

const parseText = (raw: string): Parsed => {
  let rest = raw;
  let time: string | undefined;
  const timeMatch = leadingTime.exec(rest) ?? leadingClock.exec(rest);
  if (timeMatch?.[1] !== undefined) {
    time = timeMatch[1];
    rest = rest.slice(timeMatch[0].length);
  }
  const levelMatch = levelToken.exec(rest);
  const name = levelMatch?.slice(1).find(Boolean);
  const level = name === undefined ? undefined : parseLevelName(name);
  if (levelMatch !== null && level !== undefined) rest = rest.slice(levelMatch[0].length);
  return {
    level: level ?? 'unknown',
    message: level === undefined && time === undefined ? raw : rest,
    ...(time === undefined ? {} : {time}),
  };
};

const pick = (record: Record<string, unknown>, keys: readonly string[]): unknown => {
  for (const key of keys) if (record[key] !== undefined) return record[key];
  return undefined;
};

const formatTime = (value: string | number): string => {
  if (typeof value === 'string') return sanitizeLine(value);
  // Epoch seconds and milliseconds are both common; anything below 1e11 is seconds.
  const date = new Date(value < 1e11 ? value * 1000 : value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
};
