import {Readable} from 'node:stream';
import {describe, expect, it} from 'vitest';
import {LineSplitter, readLines} from '../src/core/lines.js';

describe('LineSplitter', () => {
  it('returns only complete lines and keeps the rest pending', () => {
    const splitter = new LineSplitter();
    expect(splitter.push('one\r\ntw')).toEqual(['one']);
    expect(splitter.pending).toBe('tw');
    expect(splitter.push('o\n')).toEqual(['two']);
    expect(splitter.flush()).toEqual([]);
  });

  it('keeps multibyte characters split across chunks', () => {
    const bytes = Buffer.from('café ✓\n');
    const splitter = new LineSplitter();
    expect(splitter.push(bytes.subarray(0, 4))).toEqual([]);
    expect(splitter.push(bytes.subarray(4))).toEqual(['café ✓']);
  });

  it('yields the final unterminated line', async () => {
    const lines = [];
    for await (const line of readLines(Readable.from(['a\nb']))) lines.push(line);
    expect(lines).toEqual(['a', 'b']);
  });
});
