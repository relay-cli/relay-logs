import type {LogEntry} from '../core/entry.js';
import type {Level} from '../core/levels.js';

export interface ViewerState {
  /** Levels switched off in the viewer. Entries without a level are never hidden this way. */
  hidden: ReadonlySet<Level>;
  /** The committed search, highlighted in every line. */
  search: RegExp | undefined;
  /** Show only lines matching the search. */
  onlyMatches: boolean;
  /** Keep the newest entry selected as entries arrive. */
  following: boolean;
  /** The selected entry's sequence number, kept stable as entries arrive or are dropped. */
  selected: number | undefined;
}

export const initialViewerState: ViewerState = {
  hidden: new Set(),
  search: undefined,
  onlyMatches: false,
  following: true,
  selected: undefined,
};

/** The entries the viewer currently shows, in order. */
export const visibleEntries = (
  entries: readonly LogEntry[],
  state: Pick<ViewerState, 'hidden' | 'search' | 'onlyMatches'>,
): readonly LogEntry[] => {
  const {hidden, search, onlyMatches} = state;
  if (hidden.size === 0 && (search === undefined || !onlyMatches)) return entries;
  return entries.filter(
    (entry) =>
      (entry.level === 'unknown' || !hidden.has(entry.level)) &&
      (!onlyMatches || search === undefined || matches(search, entry.raw)),
  );
};

/**
 * The index of the selected entry in the visible list. When the selected entry is hidden, the
 * closest earlier entry is used. Following always selects the last entry.
 */
export const selectedIndex = (
  visible: readonly LogEntry[],
  state: Pick<ViewerState, 'following' | 'selected'>,
): number => {
  if (visible.length === 0) return 0;
  if (state.following || state.selected === undefined) return visible.length - 1;
  const selected = state.selected;
  let low = 0;
  let high = visible.length - 1;
  // Binary search for the last entry whose sequence number is not after the selection.
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if ((visible[middle]?.seq ?? 0) <= selected) low = middle;
    else high = middle - 1;
  }
  return low;
};

/** Find the next matching entry from `from`, searching forward or backward without wrapping. */
export const findMatch = (
  visible: readonly LogEntry[],
  from: number,
  direction: 1 | -1,
  search: RegExp,
): number | undefined => {
  for (let index = from + direction; index >= 0 && index < visible.length; index += direction) {
    const entry = visible[index];
    if (entry !== undefined && matches(search, entry.raw)) return index;
  }
  return undefined;
};

/** The first visible row, keeping the selection centered except near either end. */
export const windowStart = (selected: number, length: number, height: number): number =>
  Math.max(0, Math.min(selected - Math.floor(height / 2), length - height));

export interface Segment {
  text: string;
  match: boolean;
}

/** Split text into matching and non-matching segments for highlighting. */
export const highlight = (text: string, search: RegExp | undefined): Segment[] => {
  if (search === undefined) return [{text, match: false}];
  const global = new RegExp(search.source, `${search.flags.replace('g', '')}g`);
  const segments: Segment[] = [];
  let last = 0;
  for (const found of text.matchAll(global)) {
    if (found[0] === '') continue;
    if (found.index > last) segments.push({text: text.slice(last, found.index), match: false});
    segments.push({text: found[0], match: true});
    last = found.index + found[0].length;
  }
  if (last < text.length) segments.push({text: text.slice(last), match: false});
  return segments;
};

const matches = (search: RegExp, text: string): boolean => {
  search.lastIndex = 0;
  return search.test(text);
};
