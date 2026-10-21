import type {LogEntry} from './entry.js';
import {type Level, levelRank} from './levels.js';

export interface FilterOptions {
  /** Hide entries below this level. */
  minLevel?: Level;
  /** Show only entries matching at least one of these patterns. */
  include?: readonly RegExp[];
  /** Hide entries matching any of these patterns. */
  exclude?: readonly RegExp[];
}

/**
 * Compile a search pattern. Patterns are regular expressions and are case-insensitive unless
 * they contain an uppercase letter, so `timeout` finds `Timeout` but `Timeout` does not find
 * `timeout`.
 */
export const compilePattern = (pattern: string): RegExp => {
  try {
    return new RegExp(pattern, /\p{Lu}/u.test(pattern) ? 'u' : 'iu');
  } catch {
    throw new Error(`Not a valid pattern: ${pattern}`);
  }
};

/**
 * Create a predicate that decides whether an entry is shown.
 *
 * Indented lines without a level, such as stack frames, continue the entry above them from the
 * same source and are shown or hidden with it. Other lines without a level are hidden by
 * `minLevel`, since their level is not known.
 */
export const createFilter = (options: FilterOptions): ((entry: LogEntry) => boolean) => {
  const {minLevel, include = [], exclude = []} = options;
  const minimum = minLevel === undefined ? undefined : levelRank(minLevel);
  const lastShown = new Map<string | undefined, boolean>();

  return (entry) => {
    const continuation = entry.level === 'unknown' && /^\s/.test(entry.raw);
    const previous = lastShown.get(entry.source);
    if (continuation && previous !== undefined) return previous;

    let shown = true;
    if (minimum !== undefined) {
      shown = entry.level !== 'unknown' && levelRank(entry.level) >= minimum;
    }
    if (shown && include.length > 0) shown = include.some((pattern) => pattern.test(entry.raw));
    if (shown && exclude.length > 0) shown = !exclude.some((pattern) => pattern.test(entry.raw));
    lastShown.set(entry.source, shown);
    return shown;
  };
};
