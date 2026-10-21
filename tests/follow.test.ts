import {appendFileSync, mkdtempSync, renameSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Readable} from 'node:stream';
import {describe, expect, it} from 'vitest';
import {followFile, readLastLines} from '../src/core/follow.js';
import {mergeSources} from '../src/core/sources.js';

const directory = (): string => mkdtempSync(join(tmpdir(), 'relay-logs-follow-'));

/** Collect lines from a follower until `count` have arrived, running `steps` in between. */
const collect = async (
  path: string,
  count: number,
  steps: (() => void)[],
  initialLines = 10,
): Promise<string[]> => {
  const controller = new AbortController();
  const lines: string[] = [];
  const timer = setInterval(() => steps.shift()?.(), 60);
  try {
    for await (const line of followFile(path, {
      interval: 10,
      initialLines,
      signal: controller.signal,
    })) {
      lines.push(line);
      if (lines.length === count) break;
    }
  } finally {
    clearInterval(timer);
    controller.abort();
  }
  return lines;
};

describe('readLastLines', () => {
  it('returns the last complete lines and the offset after them', async () => {
    const path = join(directory(), 'app.log');
    writeFileSync(path, 'one\ntwo\nthree\npart');
    const result = await readLastLines(path, 2, 18);
    expect(result).toEqual({lines: ['two', 'three'], offset: 14});
  });

  it('reads files longer than one block', async () => {
    const path = join(directory(), 'big.log');
    const lines = Array.from({length: 20_000}, (_, index) => `line ${index}`);
    writeFileSync(path, `${lines.join('\n')}\n`);
    const size = Buffer.byteLength(`${lines.join('\n')}\n`);
    expect((await readLastLines(path, 3, size)).lines).toEqual([
      'line 19997',
      'line 19998',
      'line 19999',
    ]);
  });
});

describe('followFile', () => {
  it('yields the tail and then appended lines, holding back unfinished ones', async () => {
    const path = join(directory(), 'app.log');
    writeFileSync(path, 'old 1\nold 2\nold 3\n');
    const lines = await collect(
      path,
      4,
      [() => appendFileSync(path, 'new 1\nnew '), () => appendFileSync(path, '2\n')],
      2,
    );
    expect(lines).toEqual(['old 2', 'old 3', 'new 1', 'new 2']);
  });

  it('starts over when the file is truncated', async () => {
    const path = join(directory(), 'app.log');
    writeFileSync(path, 'a long first line\n');
    const lines = await collect(path, 2, [() => writeFileSync(path, 'short\n')]);
    expect(lines).toEqual(['a long first line', 'short']);
  });

  it('reads a replacement file from the beginning after rotation', async () => {
    const folder = directory();
    const path = join(folder, 'app.log');
    writeFileSync(path, 'before\n');
    const lines = await collect(path, 3, [
      () => renameSync(path, join(folder, 'app.log.1')),
      () => writeFileSync(path, 'after 1\nafter 2 is longer\n'),
    ]);
    expect(lines).toEqual(['before', 'after 1', 'after 2 is longer']);
  });

  it('waits for a file that does not exist yet', async () => {
    const path = join(directory(), 'late.log');
    const lines = await collect(path, 1, [() => writeFileSync(path, 'hello\n')]);
    expect(lines).toEqual(['hello']);
  });
});

describe('mergeSources', () => {
  it('interleaves sources and reports failures without stopping the others', async () => {
    async function* slow(): AsyncGenerator<string> {
      yield 'a1';
      await new Promise((resolve) => setTimeout(resolve, 20));
      yield 'a2';
    }
    const broken: AsyncIterable<string> = {
      [Symbol.asyncIterator]: () => ({next: () => Promise.reject(new Error('gone'))}),
    };
    const errors: string[] = [];
    const seen = [];
    for await (const item of mergeSources(
      [
        {label: 'a', lines: slow()},
        {label: 'b', lines: broken},
        {label: 'c', lines: Readable.from(['c1'])},
      ],
      (source) => errors.push(source.label ?? ''),
    )) {
      seen.push(`${item.label ?? ''}:${item.line}`);
    }
    expect(seen).toEqual(['a:a1', 'c:c1', 'a:a2']);
    expect(errors).toEqual(['b']);
  });
});
