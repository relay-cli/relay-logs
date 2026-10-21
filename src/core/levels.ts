export const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;

export type Level = (typeof levels)[number];

/** Entries whose level could not be recognized. They are always shown unless filtered by text. */
export type EntryLevel = Level | 'unknown';

const aliases: Record<string, Level> = {
  trace: 'trace',
  trc: 'trace',
  verbose: 'trace',
  debug: 'debug',
  dbg: 'debug',
  info: 'info',
  inf: 'info',
  information: 'info',
  notice: 'info',
  log: 'info',
  warn: 'warn',
  wrn: 'warn',
  warning: 'warn',
  error: 'error',
  err: 'error',
  eror: 'error',
  fatal: 'fatal',
  ftl: 'fatal',
  crit: 'fatal',
  critical: 'fatal',
  alert: 'fatal',
  emerg: 'fatal',
  emergency: 'fatal',
  panic: 'fatal',
};

/** Read a level name such as `WARNING`, `err`, or `Notice`. */
export const parseLevelName = (name: string): Level | undefined =>
  aliases[name.trim().toLowerCase()];

/** Read pino and bunyan numeric levels (10 trace through 60 fatal). */
export const parseLevelNumber = (value: number): Level | undefined => {
  if (!Number.isFinite(value)) return undefined;
  if (value >= 60) return 'fatal';
  if (value >= 50) return 'error';
  if (value >= 40) return 'warn';
  if (value >= 30) return 'info';
  if (value >= 20) return 'debug';
  if (value >= 10) return 'trace';
  return undefined;
};

export const levelRank = (level: Level): number => levels.indexOf(level);
