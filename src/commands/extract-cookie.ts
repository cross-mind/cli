/**
 * `crossmind extract-cookie` command.
 *
 * Default (headless): reuses the persistent browser profile to extract cookies
 * silently if the session is still valid.
 *
 * --headed: opens a visible Chrome window for first-time or re-login.
 * The session is saved to the persistent profile so future headless runs
 * can reuse it without prompting.
 */

import { Command } from 'commander';
import { extractAndSaveCookies, ExtractCookieLoginRequired, COOKIE_TARGETS } from '../auth/extract-cookie.js';

export function registerExtractCookieCommand(program: Command): void {
  program
    .command('extract-cookie <platform> [account]')
    .description(
      `Extract session cookies via browser. Platforms: ${Object.keys(COOKIE_TARGETS).join(', ')}\n` +
      '  Headless by default (reuses saved session). Use --headed for first-time login.'
    )
    .option('--data-dir <dir>', 'Data directory override')
    .option('--headed', 'Open a visible browser window for manual login')
    .action(async (platform: string, account: string | undefined, opts: { dataDir?: string; headed?: boolean }) => {
      const accountName = account ?? 'default';
      try {
        await extractAndSaveCookies(platform, accountName, opts.dataDir, opts.headed ?? false);
      } catch (err) {
        if (err instanceof ExtractCookieLoginRequired) {
          console.error(err.message);
        } else {
          console.error(`Cookie extraction failed: ${err instanceof Error ? err.message : String(err)}`);
        }
        process.exit(1);
      }
    });
}
