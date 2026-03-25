/**
 * `crossmind extract-cookie` command.
 * Launches Playwright browser for the user to log in manually,
 * then saves the session cookies.
 */

import { Command } from 'commander';
import { extractAndSaveCookies, COOKIE_TARGETS } from '../auth/extract-cookie.js';

export function registerExtractCookieCommand(program: Command): void {
  program
    .command('extract-cookie <platform> [account]')
    .description(
      `Extract session cookies via browser login. Platforms: ${Object.keys(COOKIE_TARGETS).join(', ')}`
    )
    .option('--data-dir <dir>', 'Data directory override')
    .action(async (platform: string, account: string | undefined, opts: { dataDir?: string }) => {
      const accountName = account ?? 'default';
      try {
        await extractAndSaveCookies(platform, accountName, opts.dataDir);
      } catch (err) {
        console.error(`Cookie extraction failed: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
