import {describe, expect, it} from 'vitest';
import {parseLine} from '../src/core/entry.js';
import {compilePattern, createFilter, type FilterOptions} from '../src/core/filter.js';

const shownLines = (options: FilterOptions, lines: string[], source?: string): string[] => {
  const shown = createFilter(options);
  return lines
    .map((line, index) =>
      parseLine(line, {seq: index + 1, ...(source === undefined ? {} : {source})}),
    )
    .filter(shown)
    .map((entry) => entry.raw);
};

describe('createFilter', () => {
  it('shows everything without options', () => {
    expect(shownLines({}, ['DEBUG a', 'plain'])).toEqual(['DEBUG a', 'plain']);
  });

  it('hides entries below the minimum level and lines without a level', () => {
    expect(
      shownLines({minLevel: 'warn'}, ['DEBUG a', 'INFO b', 'WARN c', 'ERROR d', 'plain']),
    ).toEqual(['WARN c', 'ERROR d']);
  });

  it('keeps indented continuation lines with the entry above them', () => {
    const lines = [
      'INFO request done',
      '    detail of info',
      'ERROR TypeError: x is undefined',
      '    at handler (app.js:3:5)',
      '    at main (app.js:9:1)',
    ];
    expect(shownLines({minLevel: 'error'}, lines)).toEqual(lines.slice(2));
  });

  it('matches any include pattern and drops excluded lines', () => {
    const options = {
      include: [compilePattern('timeout'), compilePattern('refused')],
      exclude: [compilePattern('health')],
    };
    expect(
      shownLines(options, ['Timeout on /users', 'timeout on /health', 'connection refused', 'ok']),
    ).toEqual(['Timeout on /users', 'connection refused']);
  });
});

describe('compilePattern', () => {
  it('ignores case unless the pattern has uppercase letters', () => {
    expect(compilePattern('error').test('ERROR')).toBe(true);
    expect(compilePattern('Error').test('ERROR')).toBe(false);
  });

  it('explains invalid patterns', () => {
    expect(() => compilePattern('(')).toThrow('Not a valid pattern: (');
  });
});
