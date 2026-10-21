import {describe, expect, it} from 'vitest';
import {parseLine} from '../src/core/entry.js';

const parse = (line: string) => parseLine(line, {seq: 1});

describe('parseLine', () => {
  it('reads text lines with a timestamp and level', () => {
    expect(parse('2026-10-21T10:00:00.123Z ERROR database unreachable')).toMatchObject({
      level: 'error',
      time: '2026-10-21T10:00:00.123Z',
      message: 'database unreachable',
    });
  });

  it('reads bracketed and colon levels', () => {
    expect(parse('[warn] disk at 91%')).toMatchObject({level: 'warn', message: 'disk at 91%'});
    expect(parse('FATAL: out of memory')).toMatchObject({level: 'fatal', message: 'out of memory'});
    expect(parse('12:00:01 INFO ready')).toMatchObject({level: 'info', time: '12:00:01'});
  });

  it('does not mistake ordinary capitals for a level', () => {
    expect(parse('GET /health 200 3ms')).toMatchObject({
      level: 'unknown',
      message: 'GET /health 200 3ms',
    });
  });

  it('reads JSON records with named and numeric levels', () => {
    expect(
      parse('{"level":"warning","msg":"slow query","time":"2026-10-21T10:00:00Z"}'),
    ).toMatchObject({
      level: 'warn',
      message: 'slow query',
      time: '2026-10-21T10:00:00Z',
    });
    expect(parse('{"level":50,"msg":"boom","time":1792576800000}')).toMatchObject({
      level: 'error',
      message: 'boom',
      time: '2026-10-21T10:00:00.000Z',
    });
  });

  it('keeps JSON that is not a record as text', () => {
    expect(parse('{not json}')).toMatchObject({level: 'unknown', message: '{not json}'});
  });

  it('reads logfmt', () => {
    expect(
      parse('time=2026-10-21T10:00:00Z level=debug msg="cache \\"warm\\"" hits=3'),
    ).toMatchObject({
      level: 'debug',
      message: 'cache "warm"',
      time: '2026-10-21T10:00:00Z',
    });
  });

  it('removes terminal control sequences', () => {
    const entry = parse('\u001b[31mERROR\u001b[0m \u001b]0;owned\u0007bad\u0008');
    expect(entry.raw).toBe('ERROR bad');
    expect(entry.level).toBe('error');
  });

  it('records the source', () => {
    expect(parseLine('x', {seq: 4, source: 'api.log'})).toMatchObject({seq: 4, source: 'api.log'});
  });
});
