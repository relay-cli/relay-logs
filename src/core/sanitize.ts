/* eslint-disable no-control-regex -- these patterns exist to match control characters. */
// Terminal escape sequences: CSI (colors, cursor movement), OSC (titles, hyperlinks), and
// two-character escapes. Log lines are untrusted, so none of these may reach the terminal.
const escapes =
  /\u001b\[[0-?]*[ -/]*[@-~]|\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)?|\u001b[@-_]?/g;
const controls = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g;

/**
 * Make one log line safe to print: drop escape sequences and control characters, and expand
 * tabs so column widths stay predictable.
 */
export const sanitizeLine = (line: string): string =>
  line.replace(escapes, '').replace(controls, '').replaceAll('\t', '  ');
