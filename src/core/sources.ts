import {createReadStream} from 'node:fs';
import {basename} from 'node:path';
import {readLines} from './lines.js';

export interface LogSource {
  /** Label shown next to the source's lines, or undefined for standard input. */
  label: string | undefined;
  lines: AsyncIterable<string>;
}

/** Open files in order, treating `-` as standard input. With no files, read standard input. */
export const openSources = (
  files: readonly string[],
  stdin: AsyncIterable<Buffer | string> = process.stdin,
): LogSource[] => {
  if (files.length === 0) return [{label: undefined, lines: readLines(stdin)}];
  return files.map((file) =>
    file === '-'
      ? {label: 'stdin', lines: readLines(stdin)}
      : {label: basename(file), lines: readLines(createReadStream(file))},
  );
};
