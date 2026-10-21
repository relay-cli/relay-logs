# Changelog

## Unreleased

- Added the `relay-logs` command, which prints files or standard input colored by level.
- Added `-f` to follow files across rotation and truncation, and `-n` to start with the last lines of each file.
- Added `-l` to filter by level and `-g` and `-x` to include or exclude lines by pattern, keeping stack frames with their entry.
- Added `parseLine`, which recognizes text, JSON, and logfmt lines, and `sanitizeLine`, which removes terminal control sequences.
