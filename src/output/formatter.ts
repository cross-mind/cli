/**
 * Output formatter — agent-friendly compact single-line format (default) or JSON.
 * No emoji, no abbreviations, key:value labels, full integers only.
 */

export interface FormatOptions {
  json?: boolean;
  quiet?: boolean;
}

/** Render a template string with field substitution and truncation. */
function renderTemplate(template: string, item: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = item[key];
    if (val === undefined || val === null) return '';
    const str = String(val);
    // Truncate long text fields
    if (['text', 'title', 'description', 'tagline', 'body', 'summary', 'headline'].includes(key) && str.length > 120) {
      return str.slice(0, 117) + '...';
    }
    return str;
  });
}

const DEFAULT_TEMPLATE = '{rank}. {title} {url}';

/**
 * Format a list of items as compact single-line strings.
 * @param items - Array of data objects
 * @param template - Template like "{rank}. [{score}] {title} {url}"
 * @param opts - Format options
 */
export function formatItems(
  items: Record<string, unknown>[],
  template: string | undefined,
  opts: FormatOptions = {}
): string {
  if (opts.json) {
    return formatJSON(items);
  }
  return items.map((item) => renderTemplate(template ?? DEFAULT_TEMPLATE, item)).join('\n');
}

/** Format as clean JSON array, no wrapper. */
export function formatJSON(items: Record<string, unknown>[]): string {
  return JSON.stringify(items, null, 2);
}

/** Footer line printed to stderr. */
export function footer(count: number, source: string, elapsedMs: number): string {
  return `\n${count} results · ${elapsedMs}ms · ${source}`;
}

/** Print formatted output + optional footer. */
export function printOutput(
  items: Record<string, unknown>[],
  template: string | undefined,
  source: string,
  startTime: number,
  opts: FormatOptions = {}
): void {
  console.log(formatItems(items, template ?? DEFAULT_TEMPLATE, opts));
  if (!opts.quiet) {
    const elapsed = Date.now() - startTime;
    process.stderr.write(footer(items.length, source, elapsed) + '\n');
  }
}
