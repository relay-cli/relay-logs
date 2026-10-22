import {render} from 'ink-testing-library';
import {setTimeout as sleep} from 'node:timers/promises';
import {describe, expect, it, vi} from 'vitest';
import {parseLine} from '../src/core/entry.js';
import {compilePattern} from '../src/core/filter.js';
import {LogBuffer} from '../src/viewer/buffer.js';
import {LogViewer} from '../src/viewer/LogViewer.js';
import {
  findMatch,
  highlight,
  initialViewerState,
  selectedIndex,
  visibleEntries,
  windowStart,
} from '../src/viewer/model.js';

const entries = (lines: string[]) => lines.map((line, index) => parseLine(line, {seq: index + 1}));

const filled = (lines: string[], capacity?: number): LogBuffer => {
  const buffer = new LogBuffer({notifyInterval: 0, ...(capacity === undefined ? {} : {capacity})});
  for (const entry of entries(lines)) buffer.push(entry);
  return buffer;
};

describe('viewer model', () => {
  const sample = entries(['DEBUG a', 'INFO b timeout', 'ERROR c', '    at x', 'INFO d timeout']);

  it('hides levels switched off but keeps lines without a level', () => {
    const visible = visibleEntries(sample, {...initialViewerState, hidden: new Set(['debug'])});
    expect(visible.map((entry) => entry.raw)).toEqual([
      'INFO b timeout',
      'ERROR c',
      '    at x',
      'INFO d timeout',
    ]);
  });

  it('shows only matches when asked', () => {
    const state = {...initialViewerState, search: compilePattern('timeout'), onlyMatches: true};
    expect(visibleEntries(sample, state).map((entry) => entry.seq)).toEqual([2, 5]);
  });

  it('keeps the selection on the same entry, or the closest earlier one', () => {
    const visible = sample.filter((entry) => entry.seq !== 3);
    expect(selectedIndex(visible, {following: false, selected: 3})).toBe(1);
    expect(selectedIndex(visible, {following: true, selected: 3})).toBe(3);
  });

  it('finds matches in either direction without wrapping', () => {
    const search = compilePattern('timeout');
    expect(findMatch(sample, 4, -1, search)).toBe(1);
    expect(findMatch(sample, 1, 1, search)).toBe(4);
    expect(findMatch(sample, 4, 1, search)).toBeUndefined();
  });

  it('centers the selection except near the ends', () => {
    expect(windowStart(50, 100, 10)).toBe(45);
    expect(windowStart(2, 100, 10)).toBe(0);
    expect(windowStart(99, 100, 10)).toBe(90);
  });

  it('splits text into highlighted segments', () => {
    expect(highlight('a Timeout b timeout', compilePattern('timeout'))).toEqual([
      {text: 'a ', match: false},
      {text: 'Timeout', match: true},
      {text: ' b ', match: false},
      {text: 'timeout', match: true},
    ]);
  });
});

describe('LogBuffer', () => {
  it('drops the oldest entries past its capacity', () => {
    const buffer = filled(
      Array.from({length: 25}, (_, index) => `line ${index + 1}`),
      20,
    );
    expect(buffer.entries.length).toBeLessThanOrEqual(20);
    expect(buffer.entries.at(-1)?.raw).toBe('line 25');
    expect(buffer.received).toBe(25);
  });

  it('notifies listeners once per batch', async () => {
    const buffer = new LogBuffer({notifyInterval: 5});
    const listener = vi.fn();
    buffer.subscribe(listener);
    for (const entry of entries(['a', 'b', 'c'])) buffer.push(entry);
    await sleep(20);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(buffer.getSnapshot()).toBe(3);
  });
});

describe('LogViewer', () => {
  const lines = [
    '2026-10-21T10:00:00.000Z INFO server started',
    '2026-10-21T10:00:01.000Z DEBUG cache warm',
    '2026-10-21T10:00:02.000Z WARN slow query',
    '2026-10-21T10:00:03.000Z ERROR request timeout',
  ];

  const open = (buffer: LogBuffer) => {
    const onQuit = vi.fn();
    const view = render(
      <LogViewer
        buffer={buffer}
        title="app.log"
        showSource={false}
        width={100}
        height={10}
        onQuit={onQuit}
      />,
    );
    return {...view, onQuit};
  };

  const press = async (stdin: {write: (data: string) => void}, ...keys: string[]) => {
    for (const key of keys) {
      stdin.write(key);
      await sleep(20);
    }
  };

  it('shows entries with their time and level while following', async () => {
    const {lastFrame} = open(filled(lines));
    await sleep(20);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Relay Logs');
    expect(frame).toContain('10:00:03.000 ERROR request timeout');
    expect(frame).toContain('● following');
  });

  it('pauses when moving up and hides levels with the number keys', async () => {
    const {lastFrame, stdin} = open(filled(lines));
    await press(stdin, 'k', '2');
    const frame = lastFrame() ?? '';
    expect(frame).toContain('paused');
    expect(frame).not.toContain('cache warm');
    expect(frame).toContain('3/4 lines');
  });

  it('searches and shows only matching lines', async () => {
    const {lastFrame, stdin} = open(filled(lines));
    await press(stdin, '/', 's', 'l', 'o', 'w', '\r', '&');
    const frame = lastFrame() ?? '';
    expect(frame).toContain('slow query');
    expect(frame).not.toContain('server started');
    expect(frame).toContain('/slow');
  });

  it('reports invalid search patterns', async () => {
    const {lastFrame, stdin} = open(filled(lines));
    await press(stdin, '/', '(', '\r');
    expect(lastFrame()).toContain('Not a valid pattern: (');
  });

  it('opens help and quits', async () => {
    const {lastFrame, stdin, onQuit} = open(filled(lines));
    await press(stdin, '?');
    expect(lastFrame()).toContain('Relay Logs controls');
    await press(stdin, '?', 'q');
    expect(onQuit).toHaveBeenCalled();
  });
});
