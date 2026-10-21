import {StringDecoder} from 'node:string_decoder';

/**
 * Split a byte stream into lines. Multibyte characters split across chunks are kept intact,
 * and both `\n` and `\r\n` endings are accepted.
 */
export class LineSplitter {
  readonly #decoder = new StringDecoder('utf8');
  #pending = '';

  /** Add a chunk and return every line it completes. */
  push(chunk: Buffer | string): string[] {
    const text = this.#pending + (typeof chunk === 'string' ? chunk : this.#decoder.write(chunk));
    const parts = text.split('\n');
    this.#pending = parts.pop() ?? '';
    return parts.map(stripCarriageReturn);
  }

  /** Return the final unterminated line, if any, and reset. */
  flush(): string[] {
    const rest = this.#pending + this.#decoder.end();
    this.#pending = '';
    return rest === '' ? [] : [stripCarriageReturn(rest)];
  }

  /** Text received after the last line ending. */
  get pending(): string {
    return this.#pending;
  }
}

const stripCarriageReturn = (line: string): string =>
  line.endsWith('\r') ? line.slice(0, -1) : line;

/** Read a stream to the end, yielding one line at a time. */
export async function* readLines(stream: AsyncIterable<Buffer | string>): AsyncGenerator<string> {
  const splitter = new LineSplitter();
  for await (const chunk of stream) yield* splitter.push(chunk);
  yield* splitter.flush();
}
