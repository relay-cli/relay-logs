import type {EntryLevel} from '../core/levels.js';

/** The Relay palette, shared with Relay Cards. */
export const theme = {
  surfaceRaised: '#202A34',
  rule: '#34414D',
  text: '#E8EDF2',
  muted: '#84909C',
  blue: '#48A8FF',
  orange: '#FF8A3D',
  red: '#FF5C6C',
  yellow: '#F4C95D',
  green: '#5DD39E',
} as const;

export const levelStyle: Record<EntryLevel, {label: string; short: string; color: string}> = {
  trace: {label: 'TRACE', short: 'TRC', color: theme.muted},
  debug: {label: 'DEBUG', short: 'DBG', color: theme.muted},
  info: {label: 'INFO', short: 'INF', color: theme.blue},
  warn: {label: 'WARN', short: 'WRN', color: theme.yellow},
  error: {label: 'ERROR', short: 'ERR', color: theme.red},
  fatal: {label: 'FATAL', short: 'FTL', color: theme.red},
  unknown: {label: '', short: '', color: theme.text},
};
