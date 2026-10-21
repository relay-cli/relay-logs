import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {basename} from 'node:path';
import {followFile, readLastLines} from './follow.js';
import {readLines} from './lines.js';

export interface LogSource {
  /** Label shown next to the source's lines, or undefined for standard input. */
  label: string | undefined;
  lines: AsyncIterable<string>;
}

export interface OpenSourcesOptions {
  /** Keep reading files as they grow. */
  follow?: boolean;
  /** Start with only the last lines of each file. Following defaults to 10. */
  lines?: number;
  /** Polling interval used when following. */
  interval?: number;
  signal?: AbortSignal;
  stdin?: AsyncIterable<Buffer | string>;
}

/** Open files in order, treating `-` as standard input. With no files, read standard input. */
export const openSources = (
  files: readonly string[],
  options: OpenSourcesOptions = {},
): LogSource[] => {
  const stdin = options.stdin ?? process.stdin;
  if (files.length === 0) return [{label: undefined, lines: readLines(stdin)}];
  return files.map((file) =>
    file === '-'
      ? {label: 'stdin', lines: readLines(stdin)}
      : {label: basename(file), lines: openFile(file, options)},
  );
};

const openFile = (file: string, options: OpenSourcesOptions): AsyncIterable<string> => {
  if (options.follow === true) {
    return followFile(file, {
      ...(options.lines === undefined ? {} : {initialLines: options.lines}),
      ...(options.interval === undefined ? {} : {interval: options.interval}),
      ...(options.signal === undefined ? {} : {signal: options.signal}),
    });
  }
  if (options.lines !== undefined) return lastLines(file, options.lines);
  return readLines(createReadStream(file));
};

async function* lastLines(file: string, count: number): AsyncGenerator<string> {
  const {size} = await stat(file);
  yield* (await readLastLines(file, count, size)).lines;
}

export interface SourcedLine {
  label: string | undefined;
  line: string;
}

/**
 * Read several sources at once and yield their lines as they arrive. Lines from one source keep
 * their order. A source that fails is reported through `onError` and the others continue.
 */
export async function* mergeSources(
  sources: readonly LogSource[],
  onError: (source: LogSource, error: unknown) => void,
): AsyncGenerator<SourcedLine> {
  const iterators = sources.map((source) => source.lines[Symbol.asyncIterator]());
  const pending = new Map<number, Promise<{index: number; result: IteratorResult<string>}>>();
  const next = (index: number): void => {
    const iterator = iterators[index];
    if (iterator === undefined) return;
    pending.set(
      index,
      iterator.next().then(
        (result) => ({index, result}),
        (error: unknown) => {
          const source = sources[index];
          if (source !== undefined) onError(source, error);
          return {index, result: {done: true, value: undefined}};
        },
      ),
    );
  };
  iterators.forEach((_, index) => next(index));
  try {
    while (pending.size > 0) {
      const {index, result} = await Promise.race(pending.values());
      pending.delete(index);
      if (result.done === true) continue;
      yield {label: sources[index]?.label, line: result.value};
      next(index);
    }
  } finally {
    // Do not wait: a source blocked on standard input would never finish returning.
    for (const iterator of iterators) void iterator.return?.();
  }
}

/** Read sources one after another, as `cat` does. A source that fails is reported and skipped. */
export async function* concatSources(
  sources: readonly LogSource[],
  onError: (source: LogSource, error: unknown) => void,
): AsyncGenerator<SourcedLine> {
  for (const source of sources) {
    try {
      for await (const line of source.lines) yield {label: source.label, line};
    } catch (error) {
      onError(source, error);
    }
  }
}
