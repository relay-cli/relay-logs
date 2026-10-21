export interface CliOptions {
  help: boolean;
  version: boolean;
  /** Force color on or off. Undefined means color when standard output is a terminal. */
  color: boolean | undefined;
  /** Keep reading files as they grow. */
  follow: boolean;
  /** Start with only the last lines of each file. */
  lines: number | undefined;
  files: string[];
}

export const helpText = `Relay Logs

Usage:
  relay-logs [options] [file...]
  some-command | relay-logs [options]

Reads log files, or standard input when no file is given, and prints each line colored by its
level.

Options:
  -f, --follow       Keep printing lines as files grow, across rotation and truncation
  -n, --lines <n>    Start with the last n lines of each file (10 when following)
  --color            Always color output
  --no-color         Never color output
  -h, --help         Show this help
  -v, --version      Show the version
`;

export const parseCliOptions = (arguments_: readonly string[]): CliOptions => {
  const options: CliOptions = {
    help: false,
    version: false,
    color: undefined,
    follow: false,
    lines: undefined,
    files: [],
  };
  let onlyFiles = false;
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index] ?? '';
    const [name, inlineValue] = splitOption(argument);
    const value = (): string => {
      if (inlineValue !== undefined) return inlineValue;
      index += 1;
      const next = arguments_[index];
      if (next === undefined) throw new Error(`${name} needs a value`);
      return next;
    };
    if (onlyFiles || argument === '-' || !argument.startsWith('-')) options.files.push(argument);
    else if (argument === '--') onlyFiles = true;
    else if (argument === '-h' || argument === '--help') options.help = true;
    else if (argument === '-v' || argument === '--version') options.version = true;
    else if (argument === '-f' || argument === '--follow') options.follow = true;
    else if (name === '-n' || name === '--lines') options.lines = parseCount(name, value());
    else if (argument === '--color') options.color = true;
    else if (argument === '--no-color') options.color = false;
    else throw new Error(`Unknown option: ${argument}`);
  }
  return options;
};

const splitOption = (argument: string): [string, string | undefined] => {
  const equals = argument.indexOf('=');
  return argument.startsWith('--') && equals !== -1
    ? [argument.slice(0, equals), argument.slice(equals + 1)]
    : [argument, undefined];
};

const parseCount = (name: string, text: string): number => {
  const count = Number(text);
  if (!Number.isInteger(count) || count < 0) {
    throw new Error(`${name} must be a whole number, not ${text}`);
  }
  return count;
};
