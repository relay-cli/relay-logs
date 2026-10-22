# Recognized lines and output formats

## Recognized lines

Relay Logs reads the level, timestamp, and message of each line:

| Input    | Recognized when                                                                                       |
| -------- | ----------------------------------------------------------------------------------------------------- |
| Text     | An optional leading timestamp is followed by a level such as `ERROR`, `[warn]`, `<info>`, or `FATAL:` |
| JSON     | The record has `level`, `lvl`, `severity`, or `levelname`, including pino and bunyan numeric levels   |
| logfmt   | The line has `level=`, with the message in `msg=`                                                     |
| Log Howl | The record uses the `dispersal-wolves/log-howl-event/v1` schema                                       |

Level names are read generously: `warning` is `warn`, `err` is `error`, `notice` is `info`, and `critical`, `emerg`, and `panic` are `fatal`. A line whose level cannot be recognized is still shown as it was written, and indented lines such as stack frames stay with the entry above them when filtering.

Terminal control sequences and control characters are removed from every line before it is shown, so a log cannot move the cursor, change the window title, or create hyperlinks.

## Log Howl alerts

Alerts are shown at their severity, with the rule name before the matched line (`failed-login: Failed password for …`). When the alert arrives on standard input, its source is the file Log Howl was watching. Severities outside the usual level names map `low` to `info`, `medium` to `warn`, and `high` to `error`.

## Output formats

`--format` chooses how printed lines are written. Any format other than `text` prints lines instead of opening the viewer.

| Format  | Output                                                                                               |
| ------- | ---------------------------------------------------------------------------------------------------- |
| `text`  | Each line as it was written, colored by level, prefixed with its file when several files are read    |
| `json`  | One object per entry with `time`, `level`, `source`, and `message`                                   |
| `cards` | Lines Relay Cards turns into cards: `[time source] ERROR: message`, warnings, JSON, and stack frames |
