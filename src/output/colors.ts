/**
 * Minimal ANSI color helpers — used sparingly for errors and footer only.
 * Disabled automatically when stdout is not a TTY.
 */
const isTTY = process.stdout.isTTY;

function wrap(code: number, reset: number) {
  return (s: string) => (isTTY ? `\x1b[${code}m${s}\x1b[${reset}m` : s);
}

export const dim = wrap(2, 22);
export const bold = wrap(1, 22);
export const red = wrap(31, 39);
export const yellow = wrap(33, 39);
export const green = wrap(32, 39);
export const cyan = wrap(36, 39);
