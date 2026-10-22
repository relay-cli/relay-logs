import {type EntryLevel, parseLevelName} from './levels.js';
import {sanitizeLine} from './sanitize.js';

/** The schema Log Howl writes on every alert it prints. */
export const logHowlSchema = 'dispersal-wolves/log-howl-event/v1';

export interface LogHowlAlert {
  level: EntryLevel;
  /** The rule name followed by the matched line, such as `failed-login: Failed password…`. */
  message: string;
  /** The name of the log file the line was found in. */
  source?: string;
}

// Log Howl severities are free-form rule settings; these cover the common scales.
const severities: Record<string, EntryLevel> = {low: 'info', medium: 'warn', high: 'error'};

/**
 * Read an alert printed by Log Howl (github.com/dispersal-wolves/log-howl), so that
 * `log-howl watch | relay-logs` shows each alert at its severity with the rule that raised it.
 */
export const readLogHowlAlert = (
  fields: Readonly<Record<string, unknown>>,
): LogHowlAlert | undefined => {
  if (fields.schema !== logHowlSchema) return undefined;
  const {severity, rule, message, source} = fields;
  const level =
    typeof severity === 'string'
      ? (parseLevelName(severity) ?? severities[severity.toLowerCase()] ?? 'unknown')
      : 'unknown';
  const text = typeof message === 'string' ? sanitizeLine(message) : '';
  return {
    level,
    message: typeof rule === 'string' ? `${sanitizeLine(rule)}: ${text}` : text,
    ...(typeof source === 'string' ? {source: sanitizeLine(source)} : {}),
  };
};
