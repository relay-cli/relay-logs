export interface CliOptions {
  help: boolean;
  version: boolean;
  /** Force color on or off. Undefined means color when standard output is a terminal. */
  color: boolean | undefined;
  files: string[];
}

export const helpText = `Relay Logs

Usage:
  relay-logs [options] [file...]
  some-command | relay-logs [options]

Reads log files, or standard input when no file is given, and prints each line colored by its
level.

Options:
  --color            Always color output
  --no-color         Never color output
  -h, --help         Show this help
  -v, --version      Show the version
`;

export const parseCliOptions = (arguments_: readonly string[]): CliOptions => {
  const options: CliOptions = {help: false, version: false, color: undefined, files: []};
  let onlyFiles = false;
  for (const argument of arguments_) {
    if (onlyFiles || argument === '-' || !argument.startsWith('-')) options.files.push(argument);
    else if (argument === '--') onlyFiles = true;
    else if (argument === '-h' || argument === '--help') options.help = true;
    else if (argument === '-v' || argument === '--version') options.version = true;
    else if (argument === '--color') options.color = true;
    else if (argument === '--no-color') options.color = false;
    else throw new Error(`Unknown option: ${argument}`);
  }
  return options;
};
