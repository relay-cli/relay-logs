import {Box, Text} from 'ink';
import {theme} from './theme.js';

const shortcuts: readonly [string, string][] = [
  ['↑ / k', 'select the previous line'],
  ['↓ / j', 'select the next line'],
  ['PgUp / b', 'move up a page'],
  ['PgDn / space', 'move down a page'],
  ['g / G', 'jump to the first line / follow the newest line'],
  ['f', 'pause or resume following'],
  ['1–6', 'show or hide trace, debug, info, warn, error, and fatal lines'],
  ['/', 'search; the pattern is a case-insensitive regular expression'],
  ['n / N', 'jump to the next newer / older match'],
  ['&', 'show only matching lines, or all lines again'],
  ['esc', 'clear the search'],
  ['c', 'clear the lines read so far'],
  ['q', 'quit'],
  ['?', 'open or close this help'],
];

export const HelpOverlay = () => (
  <Box borderStyle="double" borderColor={theme.blue} flexDirection="column" paddingX={2}>
    <Text bold color={theme.text}>
      Relay Logs controls
    </Text>
    <Box flexDirection="column" marginTop={1}>
      {shortcuts.map(([key, description]) => (
        <Box key={key} gap={2}>
          <Box width={14}>
            <Text color={theme.orange}>{key}</Text>
          </Box>
          <Text color={theme.muted}>{description}</Text>
        </Box>
      ))}
    </Box>
  </Box>
);
