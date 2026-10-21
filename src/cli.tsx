#!/usr/bin/env node

import {helpText, parseCliOptions} from './cli/options.js';
import {parseLine} from './core/entry.js';
import {openSources} from './core/sources.js';
import {formatPlain} from './format/plain.js';
import {relayLogsVersion} from './version.js';

const main = async (): Promise<void> => {
  let options;
  try {
    options = parseCliOptions(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n\n${helpText}`,
    );
    process.exitCode = 2;
    return;
  }
  if (options.help) return void process.stdout.write(helpText);
  if (options.version) return void process.stdout.write(`${relayLogsVersion}\n`);
  if (options.files.length === 0 && process.stdin.isTTY) {
    process.stderr.write(`Pass a log file or pipe output into relay-logs.\n\n${helpText}`);
    process.exitCode = 2;
    return;
  }

  // Stop quietly when the reader goes away, as in `relay-logs app.log | head`.
  process.stdout.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EPIPE') process.exit(0);
    throw error;
  });

  const format = {
    color: options.color ?? (process.stdout.isTTY && process.env.NO_COLOR === undefined),
    showSource: options.files.length > 1,
  };
  let seq = 0;
  for (const source of openSources(options.files)) {
    try {
      for await (const line of source.lines) {
        seq += 1;
        const entry = parseLine(line, {
          seq,
          ...(source.label === undefined ? {} : {source: source.label}),
        });
        process.stdout.write(`${formatPlain(entry, format)}\n`);
      }
    } catch (error) {
      process.stderr.write(
        `relay-logs: ${source.label ?? 'stdin'}: ${error instanceof Error ? error.message : String(error)}\n`,
      );
      process.exitCode = 1;
    }
  }
};

await main();
