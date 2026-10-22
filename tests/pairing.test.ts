import {describe, expect, it} from 'vitest';
import {parseLine} from '../src/core/entry.js';
import {formatCards} from '../src/format/cards.js';
import {formatJson} from '../src/format/json.js';

const alert = JSON.stringify({
  schema: 'dispersal-wolves/log-howl-event/v1',
  time: '2026-10-21T10:00:00+00:00',
  rule: 'failed-login',
  severity: 'warning',
  source: 'auth.log',
  message: 'Failed password for invalid user admin',
});

describe('Log Howl alerts', () => {
  it('reads the severity, rule, and source of an alert', () => {
    expect(parseLine(alert, {seq: 1})).toMatchObject({
      level: 'warn',
      message: 'failed-login: Failed password for invalid user admin',
      source: 'auth.log',
      time: '2026-10-21T10:00:00+00:00',
    });
  });

  it('keeps the file label when the alert comes from a file', () => {
    expect(parseLine(alert, {seq: 1, source: 'alerts.jsonl'}).source).toBe('alerts.jsonl');
  });

  it('writes alerts as text cards that keep the rule name', () => {
    expect(formatCards(parseLine(alert.replace('"warning"', '"notice"'), {seq: 1}))).toBe(
      '[2026-10-21T10:00:00+00:00 auth.log] INFO failed-login: Failed password for invalid user admin',
    );
  });

  it('maps common severity scales', () => {
    const high = alert.replace('"warning"', '"high"');
    const notice = alert.replace('"warning"', '"notice"');
    expect(parseLine(high, {seq: 1}).level).toBe('error');
    expect(parseLine(notice, {seq: 1}).level).toBe('info');
  });
});

describe('formatCards', () => {
  const cards = (line: string, source?: string) =>
    formatCards(parseLine(line, {seq: 1, ...(source === undefined ? {} : {source})}));

  it('writes errors and warnings in the form Relay Cards turns into cards', () => {
    expect(cards('2026-10-21T10:00:00Z ERROR db down', 'api.log')).toBe(
      '[2026-10-21T10:00:00Z api.log] ERROR: db down',
    );
    expect(cards('[warn] disk at 91%')).toBe('WARN: disk at 91%');
    expect(cards('FATAL out of memory')).toBe('FATAL: out of memory');
  });

  it('passes stack frames through so they join the error above', () => {
    expect(cards('    at handler (app.js:3:5)')).toBe('    at handler (app.js:3:5)');
  });

  it('keeps JSON records as JSON unless they are warnings or errors', () => {
    expect(cards('{"level":"info","msg":"ready"}')).toBe('{"level":"info","msg":"ready"}');
    expect(cards('{"level":"error","msg":"boom"}')).toBe('ERROR: boom');
  });

  it('keeps unrecognized lines as they were written', () => {
    expect(cards('GET / 200')).toBe('GET / 200');
    expect(cards('GET / 200', 'a]b.log')).toBe('[a)b.log] GET / 200');
  });
});

describe('formatJson', () => {
  it('writes the shared fields of any log format', () => {
    expect(formatJson(parseLine('12:00:01 INFO ready', {seq: 1, source: 'api.log'}))).toBe(
      '{"time":"12:00:01","level":"info","source":"api.log","message":"ready"}',
    );
    expect(formatJson(parseLine('plain', {seq: 1}))).toBe('{"message":"plain"}');
  });
});
