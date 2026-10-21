import {compilePattern} from '../core/filter.js';
import {type Level, levels, parseLevelName} from '../core/levels.js';

export interface CliOptions {
  help: boolean;
  version: boolean;
  /** Force color on or off. Undefined means color when standard output is a terminal. */
  color: boolean | undefined;
  /** Keep reading files as they grow. */
  follow: boolean;
  /** Print lines instead of opening the interactive viewer. */
  plain: boolean;
  /** Start with only the last lines of each file. */
  lines: number | undefined;
  minLevel: Level | undefined;
  include: RegExp[];
  exclude: RegExp[];
  files: string[];
}

export const helpText = `Relay Logs

Usage:
  relay-logs [options] [file...]
  some-command | relay-logs [options]

Opens log files in an interactive viewer with search and level filters. When output is
redirected or the log arrives on standard input, prints each line colored by its level instead.

Options:
  -f, --follow       Keep printing lines as files grow, across rotation and truncation
  -n, --lines <n>    Start with the last n lines of each file (10 when following)
  -l, --level <lvl>  Show only entries at this level or above (trace, debug, info, warn,
                     error, fatal)
  -g, --grep <re>    Show only lines matching this pattern; repeat to match any of several
  -x, --exclude <re> Hide lines matching this pattern; may be repeated
  --plain            Print lines instead of opening the viewer
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
    plain: false,
    lines: undefined,
    minLevel: undefined,
    include: [],
    exclude: [],
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
    else if (name === '-l' || name === '--level') options.minLevel = parseLevel(value());
    else if (name === '-g' || name === '--grep') options.include.push(compilePattern(value()));
    else if (name === '-x' || name === '--exclude') options.exclude.push(compilePattern(value()));
    else if (argument === '--plain') options.plain = true;
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

const parseLevel = (text: string): Level => {
  const level = parseLevelName(text);
  if (level === undefined) {
    throw new Error(`Unknown level: ${text}. Use one of ${levels.join(', ')}`);
  }
  return level;
};
