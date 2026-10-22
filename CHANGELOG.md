# Changelog

## Unreleased

- Added the `relay-logs` command, which prints files or standard input colored by level.
- Added `-f` to follow files across rotation and truncation, and `-n` to start with the last lines of each file.
- Added `-l` to filter by level and `-g` and `-x` to include or exclude lines by pattern, keeping stack frames with their entry.
- Added the interactive viewer with following, level toggles, and regular-expression search with highlighting, and `--plain` to print lines instead.
- Added `--format cards` for piping into Relay Cards, `--format json`, and reading of Log Howl alerts.
- Added the repository banner, social preview, demo log, and keyboard and format guides.
- Added `parseLine`, which recognizes text, JSON, and logfmt lines, and `sanitizeLine`, which removes terminal control sequences.
