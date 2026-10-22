import {useMemo, useState, useSyncExternalStore} from 'react';
import {Box, Text, useInput} from 'ink';
import type {LogEntry} from '../core/entry.js';
import {compilePattern} from '../core/filter.js';
import {levels} from '../core/levels.js';
import type {LogBuffer} from './buffer.js';
import {HelpOverlay} from './HelpOverlay.js';
import {
  findMatch,
  highlight,
  initialViewerState,
  selectedIndex,
  type ViewerState,
  visibleEntries,
  windowStart,
} from './model.js';
import {levelStyle, theme} from './theme.js';
import {useTerminalSize} from './useTerminalSize.js';

export interface LogViewerProps {
  buffer: LogBuffer;
  /** Names of the sources being read, shown in the header. */
  title: string;
  /** Show each entry's source, for viewers reading several files. */
  showSource: boolean;
  /** Override the terminal size, for tests and snapshots. */
  width?: number;
  height?: number;
  onQuit: () => void;
}

export const LogViewer = ({buffer, title, showSource, width, height, onQuit}: LogViewerProps) => {
  const version = useSyncExternalStore(buffer.subscribe, buffer.getSnapshot);
  const terminal = useTerminalSize();
  const columns = width ?? terminal.columns;
  const rows = Math.max(1, (height ?? terminal.rows) - 3);
  const [state, setState] = useState<ViewerState>(initialViewerState);
  const [draft, setDraft] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  const [showHelp, setShowHelp] = useState(false);

  // `version` changes whenever the buffer does; the entries array itself is reused.
  const visible = useMemo(() => visibleEntries(buffer.entries, state), [version, state]);
  const cursor = selectedIndex(visible, state);
  const start = windowStart(cursor, visible.length, rows);

  const select = (index: number): void => {
    const clamped = Math.max(0, Math.min(index, visible.length - 1));
    const following = clamped >= visible.length - 1;
    setState((current) => ({...current, following, selected: visible[clamped]?.seq}));
  };

  const jump = (direction: 1 | -1, search = state.search, from = cursor): void => {
    if (search === undefined) return setNotice('Press / to search first');
    const found = findMatch(visible, from, direction, search);
    if (found === undefined)
      return setNotice(direction === 1 ? 'No newer match' : 'No older match');
    setNotice(undefined);
    select(found);
  };

  useInput((input, key) => {
    if (showHelp) {
      if (input === '?' || input === 'q' || key.escape) setShowHelp(false);
      return;
    }
    if (draft !== undefined) {
      if (key.escape) setDraft(undefined);
      else if (key.return) {
        setDraft(undefined);
        if (draft === '') return;
        let search: RegExp;
        try {
          search = compilePattern(draft);
        } catch (error) {
          return setNotice(error instanceof Error ? error.message : String(error));
        }
        setState((current) => ({...current, search}));
        // Start from the selection itself, then look further back in time.
        jump(-1, search, cursor + 1);
      } else if (key.backspace || key.delete) setDraft(draft.slice(0, -1));
      else if (!key.ctrl && !key.meta) setDraft(draft + input);
      return;
    }

    setNotice(undefined);
    if (input === 'q' || (key.ctrl && input === 'c')) onQuit();
    else if (input === '?') setShowHelp(true);
    else if (key.upArrow || input === 'k') select(cursor - 1);
    else if (key.downArrow || input === 'j') select(cursor + 1);
    else if (key.pageUp || input === 'b') select(cursor - rows);
    else if (key.pageDown || input === ' ') select(cursor + rows);
    else if (key.home || input === 'g') select(0);
    else if (key.end || input === 'G') select(visible.length - 1);
    else if (input === 'f') {
      setState((current) => ({
        ...current,
        following: !current.following,
        selected: visible[cursor]?.seq,
      }));
    } else if (input === '/') setDraft('');
    else if (input === 'n') jump(1);
    else if (input === 'N') jump(-1);
    else if (input === '&') {
      if (state.search === undefined) setNotice('Press / to search first');
      else setState((current) => ({...current, onlyMatches: !current.onlyMatches}));
    } else if (key.escape) {
      setState((current) => ({...current, search: undefined, onlyMatches: false}));
    } else if (input >= '1' && input <= '6') {
      const level = levels[Number(input) - 1];
      if (level === undefined) return;
      setState((current) => {
        const hidden = new Set(current.hidden);
        if (!hidden.delete(level)) hidden.add(level);
        return {...current, hidden};
      });
    } else if (input === 'c') {
      buffer.clear();
      setState((current) => ({...current, following: true, selected: undefined}));
    }
  });

  if (showHelp) return <HelpOverlay />;

  const shown = visible.slice(start, start + rows);
  // Columns are sized to the lines on screen, so logs without timestamps lose no space.
  const timeWidth = Math.max(0, ...shown.map((entry) => timeOfDay(entry.time).length));
  const sourceWidth = showSource
    ? Math.max(0, ...shown.map((entry) => entry.source?.length ?? 0))
    : 0;
  return (
    <Box flexDirection="column" width={columns}>
      <Header
        title={title}
        visible={visible.length}
        total={buffer.received}
        state={state}
        width={columns}
      />
      <Box flexDirection="column" height={rows}>
        {shown.length === 0 ? (
          <Text color={theme.muted}>
            {buffer.entries.length === 0 ? 'Waiting for log lines…' : 'No lines match.'}
          </Text>
        ) : (
          shown.map((entry, offset) => (
            <Row
              key={entry.seq}
              entry={entry}
              selected={start + offset === cursor}
              search={state.search}
              timeWidth={timeWidth}
              sourceWidth={sourceWidth}
              width={columns}
            />
          ))
        )}
      </Box>
      <Footer draft={draft} notice={notice} state={state} />
    </Box>
  );
};

const Header = ({
  title,
  visible,
  total,
  state,
  width,
}: {
  title: string;
  visible: number;
  total: number;
  state: ViewerState;
  width: number;
}) => (
  <Box width={width} justifyContent="space-between">
    <Text wrap="truncate">
      <Text bold color={theme.orange}>
        Relay Logs
      </Text>
      <Text color={theme.muted}> {title}</Text>
    </Text>
    <Text>
      {levels.map((level) => (
        <Text
          key={level}
          color={state.hidden.has(level) ? theme.rule : levelStyle[level].color}
          strikethrough={state.hidden.has(level)}
        >
          {levelStyle[level].short}{' '}
        </Text>
      ))}
      <Text color={theme.muted}>{visible === total ? total : `${visible}/${total}`} lines </Text>
      {state.following ? (
        <Text color={theme.green}>● following</Text>
      ) : (
        <Text color={theme.yellow}>❚❚ paused</Text>
      )}
    </Text>
  </Box>
);

const timeOfDay = (time: string | undefined): string => {
  if (time === undefined) return '';
  return /\d{2}:\d{2}:\d{2}(?:[.,]\d{1,3})?/.exec(time)?.[0] ?? time;
};

const Row = ({
  entry,
  selected,
  search,
  timeWidth,
  sourceWidth,
  width,
}: {
  entry: LogEntry;
  selected: boolean;
  search: RegExp | undefined;
  timeWidth: number;
  sourceWidth: number;
  width: number;
}) => {
  const style = levelStyle[entry.level];
  const time = timeOfDay(entry.time);
  return (
    <Box width={width} {...(selected ? {backgroundColor: theme.surfaceRaised} : {})}>
      <Text wrap="truncate">
        {timeWidth > 0 && <Text color={theme.muted}>{time.padEnd(timeWidth)} </Text>}
        <Text bold color={style.color}>
          {style.label.padEnd(5)}
        </Text>{' '}
        {sourceWidth > 0 && (
          <Text color={theme.blue}>{(entry.source ?? '').padEnd(sourceWidth)} </Text>
        )}
        {highlight(entry.message, search).map((segment, index) =>
          segment.match ? (
            <Text key={index} backgroundColor={theme.orange} color="black">
              {segment.text}
            </Text>
          ) : (
            <Text key={index} color={entry.level === 'unknown' ? theme.text : style.color}>
              {segment.text}
            </Text>
          ),
        )}
      </Text>
    </Box>
  );
};

const Footer = ({
  draft,
  notice,
  state,
}: {
  draft: string | undefined;
  notice: string | undefined;
  state: ViewerState;
}) => {
  if (draft !== undefined) {
    return (
      <Text>
        <Text color={theme.orange}>/</Text>
        {draft}
        <Text inverse> </Text>
      </Text>
    );
  }
  if (notice !== undefined) return <Text color={theme.yellow}>{notice}</Text>;
  return (
    <Text color={theme.muted} wrap="truncate">
      {state.search === undefined
        ? '↑↓ move  / search  1–6 levels  f follow  ? help  q quit'
        : `/${state.search.source}  n newer  N older  & ${state.onlyMatches ? 'show all' : 'only matches'}  esc clear`}
    </Text>
  );
};
