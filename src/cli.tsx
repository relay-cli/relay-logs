#!/usr/bin/env node

import {render} from 'ink';
import {type CliOptions, helpText, parseCliOptions} from './cli/options.js';
import {type LogEntry, parseLine} from './core/entry.js';
import {createFilter} from './core/filter.js';
import {concatSources, type LogSource, mergeSources, openSources} from './core/sources.js';
import {formatCards} from './format/cards.js';
import {formatJson} from './format/json.js';
import {formatPlain} from './format/plain.js';
import {LogBuffer} from './viewer/buffer.js';
import {LogViewer} from './viewer/LogViewer.js';
import {relayLogsVersion} from './version.js';

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Read the chosen sources and yield the entries that pass the command-line filters. */
async function* readEntries(
  options: CliOptions,
  signal: AbortSignal | undefined,
  onError: (source: LogSource, error: unknown) => void,
): AsyncGenerator<LogEntry> {
  const sources = openSources(options.files, {
    follow: options.follow,
    ...(options.lines === undefined ? {} : {lines: options.lines}),
    ...(signal === undefined ? {} : {signal}),
  });
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
    if (shown(entry)) yield entry;
  }
}

const runPlain = async (options: CliOptions): Promise<void> => {
  // Stop quietly when the reader goes away, as in `relay-logs app.log | head`.
  process.stdout.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EPIPE') process.exit(0);
    throw error;
  });
  const plain = {
    color: options.color ?? (process.stdout.isTTY && process.env.NO_COLOR === undefined),
    showSource: options.files.length > 1,
  };
  const format =
    options.format === 'json'
      ? formatJson
      : options.format === 'cards'
        ? formatCards
        : (entry: LogEntry) => formatPlain(entry, plain);
  const onError = (source: LogSource, error: unknown): void => {
    process.stderr.write(`relay-logs: ${source.label ?? 'stdin'}: ${errorMessage(error)}\n`);
    process.exitCode = 1;
  };
  for await (const entry of readEntries(options, undefined, onError)) {
    process.stdout.write(`${format(entry)}\n`);
  }
};

const runViewer = async (options: CliOptions): Promise<void> => {
  const controller = new AbortController();
  const buffer = new LogBuffer();
  const failures: string[] = [];
  const app = render(
    <LogViewer
      buffer={buffer}
      title={options.files.join(', ')}
      showSource={options.files.length > 1}
      onQuit={() => app.unmount()}
    />,
    {alternateScreen: true, exitOnCtrlC: false},
  );
  const onError = (source: LogSource, error: unknown): void => {
    failures.push(`relay-logs: ${source.label ?? 'stdin'}: ${errorMessage(error)}`);
  };
  void (async () => {
    for await (const entry of readEntries(options, controller.signal, onError)) buffer.push(entry);
  })().catch((error: unknown) => failures.push(`relay-logs: ${errorMessage(error)}`));

  const interrupt = (): void => app.unmount();
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', interrupt);
  await app.waitUntilExit();
  controller.abort();
  for (const failure of failures) process.stderr.write(`${failure}\n`);
  // Standard input may still be open, so leave instead of waiting for the readers.
  process.exit(failures.length > 0 ? 1 : 0);
};

const main = async (): Promise<void> => {
  let options;
  try {
    options = parseCliOptions(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${errorMessage(error)}\n\n${helpText}`);
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

  // The viewer needs the keyboard, so it opens only when standard input is a terminal rather
  // than the log itself.
  const interactive =
    !options.plain &&
    options.format === 'text' &&
    process.stdout.isTTY &&
    process.stdin.isTTY &&
    options.files.length > 0 &&
    !options.files.includes('-');
  await (interactive ? runViewer(options) : runPlain(options));
};

await main();
