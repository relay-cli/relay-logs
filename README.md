# Relay Logs

Relay Logs is a live log viewer for the terminal. It follows files as they grow, recognizes the level, timestamp, and message of each line, whether the line is plain text, JSON, or logfmt, and lets you filter by level and search as lines arrive.

## Read a log

```sh
relay-logs app.log
relay-logs api.log worker.log
npm run dev 2>&1 | relay-logs
```

When several files are given, each line is prefixed with the name of the file it came from. Use `-` to read standard input alongside files.
In a terminal, files open in the interactive viewer described below. When output is piped or the log arrives on standard input, each line is printed colored by its level, prefixed with the name of its file when several files are given. Use `-` to read standard input alongside files.

## View a log

```sh
relay-logs -f api.log worker.log
```

When standard input and output are both terminals, Relay Logs opens an interactive viewer. Each line shows its time, level, source, and message, and the newest line stays in view until you scroll up. Press `?` for the keyboard reference and `q` to quit.

| Key             | Action                                                        |
| --------------- | ------------------------------------------------------------- |
| `↑`, `k`        | Select the previous line and pause following                  |
| `↓`, `j`        | Select the next line; reaching the newest line resumes        |
| `PgUp`, `b`     | Move up a page                                                |
| `PgDn`, `space` | Move down a page                                              |
| `g`, `G`        | Jump to the first line or follow the newest one               |
| `f`             | Pause or resume following                                     |
| `1`–`6`         | Show or hide trace, debug, info, warn, error, and fatal lines |
| `/`             | Search with a regular expression and highlight matches        |
| `n`, `N`        | Jump to the next newer or older match                         |
| `&`             | Show only matching lines, or all lines again                  |
| `Esc`           | Clear the search                                              |
| `c`             | Clear the lines read so far                                   |

The viewer keeps the newest 50,000 lines. Output that is piped or redirected, and logs read from standard input, are printed as plain lines instead; `--plain` does the same in a terminal.

## Follow a log

```sh
relay-logs -f app.log
relay-logs -f -n 50 api.log worker.log
```

`-f` keeps printing lines as files grow, like `tail -F`. It starts with the last 10 lines of each file, or the number given with `-n`. Lines appear only once their line ending has been written, so a line still being written is never split. When a file is truncated, Relay Logs reads it again from the start, and when it is replaced by log rotation, the new file is read from its first line. A file that does not exist yet is waited for.

When several files are followed, their lines are interleaved in the order they arrive.

## Filter

```sh
relay-logs -l warn app.log
relay-logs -f -g timeout -g refused -x /health api.log
```

`-l` shows only entries at a level or above: `trace`, `debug`, `info`, `warn`, `error`, or `fatal`. Lines without a recognizable level are hidden by `-l`, except indented lines such as stack frames, which stay with the entry above them.

`-g` shows only lines matching a regular expression, and `-x` hides lines matching one. Both may be repeated. Patterns ignore case unless they contain an uppercase letter.

## Use with Relay Cards

`--format cards` writes each entry in the form [Relay Cards](https://github.com/relay-cli/relay-cards) turns into a card, so a followed log can be read as cards:

```sh
relay-logs -f --format cards api.log | relay-cards
```

Errors and fatal entries become error cards that collect the stack frames printed after them, warnings become warning cards, and JSON records become JSON cards. Use `-l` and `-g` to decide what reaches Relay Cards.

`--format json` writes one JSON object per entry with `time`, `level`, `source`, and `message`, whatever format the log was in.

## Use with Log Howl

Relay Logs reads the alerts [Log Howl](https://github.com/dispersal-wolves/log-howl) prints. Each alert is shown at its severity, with the rule that raised it before the matched line and the watched file as its source:

```sh
log-howl watch --config rules.json >> alerts.jsonl &
relay-logs -f alerts.jsonl
```

Writing alerts to a file and following it keeps the interactive viewer available. Alerts can also be piped straight through, for example `log-howl watch --config rules.json | relay-logs --format cards | relay-cards`.

## Recognized lines

- Text lines with an optional leading timestamp and a level such as `ERROR`, `[warn]`, `<info>`, or `FATAL:`
- JSON records with `level`, `lvl`, `severity`, or `levelname`, including pino and bunyan numeric levels
- logfmt lines with `level=` and `msg=`
- alerts from Log Howl, read at their severity with the rule name

A line whose level cannot be recognized is still shown as it was written. Terminal control sequences are removed from every line before it is printed, so a log cannot move the cursor or change terminal settings.

## Development

```sh
npm install
npm run check
```

Relay Logs requires Node.js 22 or newer. See [the architecture notes](./docs/architecture.md) and [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
