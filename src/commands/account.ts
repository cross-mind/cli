/**
 * `crossmind account` command group.
 * Subcommands: list, use, remove, show
 */

import { Command } from 'commander';
import {
  listAccounts, removeCredential, setDefaultAccount,
  getDefaultAccount, loadCredential, getDataDir,
} from '../auth/store.js';

export function registerAccountCommands(program: Command): void {
  const account = program
    .command('account')
    .description('Manage stored platform accounts');

  // account list [platform]
  account
    .command('list [platform]')
    .description('List all stored accounts, optionally filtered by platform')
    .option('--data-dir <dir>', 'Data directory override')
    .action(async (platform: string | undefined, opts: { dataDir?: string }) => {
      const accounts = await listAccounts(platform, opts.dataDir);
      if (accounts.length === 0) {
        console.log('No accounts stored.');
        return;
      }
      for (const a of accounts) {
        const def = await getDefaultAccount(a.platform, opts.dataDir);
        const marker = def === a.name ? ' (default)' : '';
        const handle = a.handle ? ` @${a.handle}` : '';
        const authType = a.authToken ? 'cookie' : a.accessToken ? 'oauth' : a.appPassword ? 'app-password' : a.apiToken ? 'token' : 'unknown';
        console.log(`${a.platform}/${a.name}${handle} [${authType}]${marker}`);
      }
    });

  // account use <platform> <name>
  account
    .command('use <platform> <name>')
    .description('Set the default account for a platform')
    .option('--data-dir <dir>', 'Data directory override')
    .action(async (platform: string, name: string, opts: { dataDir?: string }) => {
      const cred = await loadCredential(platform, name, opts.dataDir);
      if (!cred) {
        console.error(`Account "${name}" not found for platform "${platform}".`);
        process.exit(1);
      }
      await setDefaultAccount(platform, name, opts.dataDir);
      console.log(`Default ${platform} account set to "${name}".`);
    });

  // account remove <platform> <name>
  account
    .command('remove <platform> <name>')
    .description('Remove a stored account')
    .option('--data-dir <dir>', 'Data directory override')
    .action(async (platform: string, name: string, opts: { dataDir?: string }) => {
      await removeCredential(platform, name, opts.dataDir);
      console.log(`Removed ${platform}/${name}.`);
    });

  // account show <platform> [name]
  account
    .command('show <platform> [name]')
    .description('Show stored credential info (no secrets)')
    .option('--data-dir <dir>', 'Data directory override')
    .action(async (platform: string, name: string | undefined, opts: { dataDir?: string }) => {
      const resolvedName = name ?? (await getDefaultAccount(platform, opts.dataDir)) ?? 'default';
      const cred = await loadCredential(platform, resolvedName, opts.dataDir);
      if (!cred) {
        console.error(`No credentials found for ${platform}/${resolvedName}.`);
        process.exit(1);
      }
      console.log(`platform: ${cred.platform}`);
      console.log(`name: ${cred.name}`);
      if (cred.handle) console.log(`handle: ${cred.handle}`);
      if (cred.did) console.log(`did: ${cred.did}`);
      if (cred.authToken) console.log(`auth_type: cookie`);
      else if (cred.accessToken) console.log(`auth_type: oauth`);
      else if (cred.appPassword) console.log(`auth_type: app-password`);
      else if (cred.apiToken) console.log(`auth_type: token`);
      if (cred.expiresAt) {
        const remaining = Math.round((cred.expiresAt - Date.now()) / 1000 / 60);
        console.log(`expires_in: ${remaining}min`);
      }
      const dataDir = getDataDir(opts.dataDir);
      console.log(`data_dir: ${dataDir}`);
    });
}
