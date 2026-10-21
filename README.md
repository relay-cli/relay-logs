# Relay Logs

Relay Logs reads log files and command output in the terminal. It recognizes the level, timestamp, and message of each line, whether the line is plain text, JSON, or logfmt, and colors it by level.

## Read a log

```sh
relay-logs app.log
relay-logs api.log worker.log
npm run dev 2>&1 | relay-logs
```

When several files are given, each line is prefixed with the name of the file it came from. Use `-` to read standard input alongside files.

## Recognized lines

- Text lines with an optional leading timestamp and a level such as `ERROR`, `[warn]`, `<info>`, or `FATAL:`
- JSON records with `level`, `lvl`, `severity`, or `levelname`, including pino and bunyan numeric levels
- logfmt lines with `level=` and `msg=`

A line whose level cannot be recognized is still shown as it was written. Terminal control sequences are removed from every line before it is printed, so a log cannot move the cursor or change terminal settings.

## Development

```sh
npm install
npm run check
```

Relay Logs requires Node.js 22 or newer. See [the architecture notes](./docs/architecture.md) and [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
