# Architecture

Relay Logs turns lines from files or standard input into log entries and displays them.

1. `LineSplitter` and `readLines` split byte streams into complete lines without breaking multibyte characters.
2. `openSources` opens each file, or standard input, as a labeled stream of lines. `followFile` polls a file for appended lines and notices truncation and rotation by its size and identity. `mergeSources` interleaves followed files as their lines arrive.
3. `parseLine` sanitizes a line and recognizes its level, timestamp, and message. The original text is kept in `raw`, so nothing is lost when a line is not recognized.
4. `formatPlain` prints an entry for pipes and plain terminals.
5. `createFilter` decides which entries are shown by level and pattern, carrying the decision for an entry over to its indented continuation lines.
6. `LogBuffer` holds the entries the viewer can scroll through, drops the oldest past its capacity, and notifies the viewer in batches.
7. `LogViewer` renders the buffer with Ink. Its state lives in `viewer/model.ts` as plain functions: which entries are visible, which one is selected, and where search matches are. The selection is kept by sequence number, so it stays on the same line as new lines arrive and old ones are dropped.
8. `formatCards` and `formatJson` write entries for other tools, and `readLogHowlAlert` reads alerts from Log Howl. Relay Logs depends on neither project; they meet at the line format.
