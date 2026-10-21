import {open, stat} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {LineSplitter} from './lines.js';

export interface FollowOptions {
  /** Lines already in the file to yield before following. Defaults to 10. */
  initialLines?: number;
  /** How often to check the file for changes, in milliseconds. Defaults to 250. */
  interval?: number;
  /** Stop following when aborted. */
  signal?: AbortSignal;
}

interface FileState {
  identity: string;
  offset: number;
}

const blockSize = 64 * 1024;

/**
 * Yield the last lines of a file and then every line appended to it, like `tail -F`.
 *
 * Only complete lines are yielded, so a line still being written is held back until its line
 * ending arrives. When the file is truncated the reader starts again from the beginning, and
 * when it is replaced, as log rotation does, the new file is read from its first line. A file
 * that does not exist yet is waited for.
 */
export async function* followFile(
  path: string,
  options: FollowOptions = {},
): AsyncGenerator<string> {
  const interval = options.interval ?? 250;
  const signal = options.signal;
  let state: FileState | undefined;
  let splitter = new LineSplitter();

  while (signal?.aborted !== true) {
    const info = await stat(path).catch(() => undefined);
    if (info !== undefined) {
      const identity = `${info.dev}:${info.ino}:${info.birthtimeMs}`;
      if (state === undefined) {
        const start = await readLastLines(path, options.initialLines ?? 10, info.size);
        state = {identity, offset: start.offset};
        yield* start.lines;
      } else if (identity !== state.identity || info.size < state.offset) {
        // Rotated or truncated: the rest of the old line will never be completed.
        state = {identity, offset: 0};
        splitter = new LineSplitter();
      }
      if (info.size > state.offset) {
        const chunk = await readRange(path, state.offset, info.size);
        state.offset += chunk.length;
        yield* splitter.push(chunk);
      }
    }
    await sleep(interval, undefined, signal === undefined ? {} : {signal}).catch(() => undefined);
  }
}

/**
 * Read the last complete lines of a file. The returned offset points just past the last line
 * ending, so an unterminated final line is read again when it is completed.
 */
export const readLastLines = async (
  path: string,
  count: number,
  size: number,
): Promise<{lines: string[]; offset: number}> => {
  const handle = await open(path, 'r');
  try {
    let start = size;
    let buffer = Buffer.alloc(0);
    // Read backwards until the buffer holds more line endings than lines requested.
    while (start > 0 && countNewlines(buffer) <= count) {
      const next = Math.max(0, start - blockSize);
      const block = Buffer.alloc(start - next);
      await handle.read(block, 0, block.length, next);
      buffer = Buffer.concat([block, buffer]);
      start = next;
    }
    const lastNewline = buffer.lastIndexOf(0x0a);
    if (lastNewline === -1) return {lines: [], offset: start};
    const complete = buffer.subarray(0, lastNewline + 1);
    const splitter = new LineSplitter();
    let lines = splitter.push(complete);
    // The first line is partial unless the read reached the start of the file.
    if (start > 0) lines = lines.slice(1);
    return {
      lines: count === 0 ? [] : lines.slice(-count),
      offset: start + lastNewline + 1,
    };
  } finally {
    await handle.close();
  }
};

const readRange = async (path: string, from: number, to: number): Promise<Buffer> => {
  const handle = await open(path, 'r');
  try {
    const buffer = Buffer.alloc(to - from);
    const {bytesRead} = await handle.read(buffer, 0, buffer.length, from);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
};

const countNewlines = (buffer: Buffer): number => {
  let count = 0;
  for (const byte of buffer) if (byte === 0x0a) count += 1;
  return count;
};
