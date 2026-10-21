import {execFile} from 'node:child_process';
import {mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import {describe, expect, it} from 'vitest';
import {parseCliOptions} from '../src/cli/options.js';

const run = promisify(execFile);
const cli = fileURLToPath(new URL('../src/cli.tsx', import.meta.url));
const tsx = fileURLToPath(new URL('../node_modules/tsx/dist/cli.mjs', import.meta.url));

describe('CLI options', () => {
  it('reads files and color flags', () => {
    expect(parseCliOptions(['--no-color', 'a.log', '--', '--b.log'])).toMatchObject({
      color: false,
      files: ['a.log', '--b.log'],
    });
  });

  it('reads follow and line counts', () => {
    expect(parseCliOptions(['-f', '--lines=5', 'a.log'])).toMatchObject({follow: true, lines: 5});
    expect(() => parseCliOptions(['-n', 'many'])).toThrow('whole number');
  });

  it('rejects unknown options', () => {
    expect(() => parseCliOptions(['--wat'])).toThrow('Unknown option');
  });
});

describe('relay-logs command', () => {
  it('prints files with their names when there are several', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'relay-logs-'));
    writeFileSync(join(directory, 'api.log'), 'INFO started\nERROR failed\n');
    writeFileSync(join(directory, 'worker.log'), 'WARN slow');
    const {stdout} = await run(process.execPath, [
      tsx,
      cli,
      '--no-color',
      join(directory, 'api.log'),
      join(directory, 'worker.log'),
    ]);
    expect(stdout).toBe('api.log: INFO started\napi.log: ERROR failed\nworker.log: WARN slow\n');
  }, 30_000);

  it('starts with the last lines when asked', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'relay-logs-'));
    writeFileSync(join(directory, 'app.log'), 'one\ntwo\nthree\n');
    const {stdout} = await run(process.execPath, [tsx, cli, '-n', '2', join(directory, 'app.log')]);
    expect(stdout).toBe('two\nthree\n');
  }, 30_000);

  it('colors by level when asked', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'relay-logs-'));
    writeFileSync(join(directory, 'app.log'), 'ERROR failed\n');
    const {stdout} = await run(process.execPath, [tsx, cli, '--color', join(directory, 'app.log')]);
    expect(stdout).toBe('\u001b[31mERROR failed\u001b[0m\n');
  }, 30_000);

  it('reports a missing file and exits with 1', async () => {
    await expect(
      run(process.execPath, [tsx, cli, join(tmpdir(), 'relay-logs-missing.log')]),
    ).rejects.toMatchObject({code: 1});
  }, 30_000);
});
