# Keyboard reference

The viewer opens when standard input and output are both terminals. Press `?` inside it for the same list.

## Moving

| Key             | Action                                                 |
| --------------- | ------------------------------------------------------ |
| `↑`, `k`        | Select the previous line and pause following           |
| `↓`, `j`        | Select the next line; reaching the newest line resumes |
| `PgUp`, `b`     | Move up a page                                         |
| `PgDn`, `space` | Move down a page                                       |
| `g`, `Home`     | Jump to the first line                                 |
| `G`, `End`      | Follow the newest line                                 |
| `f`             | Pause or resume following                              |

While paused, new lines are still read and counted in the header, and the selected line stays where it is.

## Levels

`1` through `6` show or hide trace, debug, info, warn, error, and fatal lines. Hidden levels are struck through in the header. Lines without a level are never hidden this way.

## Search

| Key   | Action                                          |
| ----- | ----------------------------------------------- |
| `/`   | Type a pattern and press `Enter`; `Esc` cancels |
| `n`   | Jump to the next newer match                    |
| `N`   | Jump to the next older match                    |
| `&`   | Show only matching lines, or all lines again    |
| `Esc` | Clear the search                                |

Patterns are regular expressions and ignore case unless they contain an uppercase letter. Committing a search selects the nearest match at or above the selected line.

## Other

| Key           | Action                       |
| ------------- | ---------------------------- |
| `c`           | Clear the lines read so far  |
| `?`           | Open or close this reference |
| `q`, `Ctrl+C` | Quit                         |
