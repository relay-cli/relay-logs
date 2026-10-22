import type {LogEntry} from '../core/entry.js';

export interface LogBufferOptions {
  /** Entries kept before the oldest are dropped. Defaults to 50,000. */
  capacity?: number;
  /** Listeners are told about new entries at most this often, in milliseconds. Defaults to 50. */
  notifyInterval?: number;
}

/**
 * Holds the entries a viewer can scroll through. Busy logs can produce thousands of lines a
 * second, so listeners are notified in batches rather than once per entry.
 */
export class LogBuffer {
  readonly capacity: number;
  readonly #notifyInterval: number;
  readonly #listeners = new Set<() => void>();
  #entries: LogEntry[] = [];
  #version = 0;
  #published = 0;
  #received = 0;
  #timer: NodeJS.Timeout | undefined;

  constructor(options: LogBufferOptions = {}) {
    this.capacity = options.capacity ?? 50_000;
    this.#notifyInterval = options.notifyInterval ?? 50;
  }

  get entries(): readonly LogEntry[] {
    return this.#entries;
  }

  /** Changes whenever the entries change. */
  get version(): number {
    return this.#version;
  }

  /** Entries added since the buffer was created or cleared, including dropped ones. */
  get received(): number {
    return this.#received;
  }

  push(entry: LogEntry): void {
    this.#entries.push(entry);
    this.#received += 1;
    if (this.#entries.length > this.capacity) {
      // Drop a tenth at a time so trimming is not paid on every push.
      this.#entries = this.#entries.slice(
        this.#entries.length - this.capacity + Math.ceil(this.capacity / 10),
      );
    }
    this.#changed();
  }

  clear(): void {
    this.#entries = [];
    this.#received = 0;
    this.#changed();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  /** The version listeners were last told about, for `useSyncExternalStore`. */
  getSnapshot = (): number => this.#published;

  #changed(): void {
    this.#version += 1;
    if (this.#timer !== undefined) return;
    this.#timer = setTimeout(() => {
      this.#timer = undefined;
      this.#published = this.#version;
      for (const listener of this.#listeners) listener();
    }, this.#notifyInterval);
  }
}
