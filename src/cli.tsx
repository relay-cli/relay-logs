#!/usr/bin/env node

import {helpText, parseCliOptions} from './cli/options.js';
import {parseLine} from './core/entry.js';
import {createFilter} from './core/filter.js';
import {concatSources, type LogSource, mergeSources, openSources} from './core/sources.js';
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
  const sources = openSources(options.files, {
    follow: options.follow,
    ...(options.lines === undefined ? {} : {lines: options.lines}),
  });
  const onError = (source: LogSource, error: unknown): void => {
    process.stderr.write(
      `relay-logs: ${source.label ?? 'stdin'}: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  };
  const lines = options.follow ? mergeSources(sources, onError) : concatSources(sources, onError);
  const shown = createFilter({
    ...(options.minLevel === undefined ? {} : {minLevel: options.minLevel}),
    include: options.include,
    exclude: options.exclude,
  });
  let seq = 0;
  for await (const {label, line} of lines) {
    seq += 1;
    const entry = parseLine(line, {seq, ...(label === undefined ? {} : {source: label})});
    if (!shown(entry)) continue;
    process.stdout.write(`${formatPlain(entry, format)}\n`);
  }
};

await main();
