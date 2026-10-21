# Architecture

Relay Logs turns lines from files or standard input into log entries and displays them.

1. `LineSplitter` and `readLines` split byte streams into complete lines without breaking multibyte characters.
2. `openSources` opens each file, or standard input, as a labeled stream of lines. `followFile` polls a file for appended lines and notices truncation and rotation by its size and identity. `mergeSources` interleaves followed files as their lines arrive.
3. `parseLine` sanitizes a line and recognizes its level, timestamp, and message. The original text is kept in `raw`, so nothing is lost when a line is not recognized.
4. `formatPlain` prints an entry for pipes and plain terminals.

Filtering and the interactive viewer build on these modules.
