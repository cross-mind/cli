/**
 * crossmind config — manage global settings (dedup, etc.).
 */

import { Command } from 'commander';
import { loadDedupConfig, saveDedupConfig, type DedupConfig } from '../http/write-history.js';

export function registerConfigCommands(program: Command): void {
  const config = program
    .command('config')
    .description('Manage global settings');

  config
    .command('show')
    .description('Show current config')
    .action(async () => {
      const dedup = await loadDedupConfig();
      console.log(`dedup.enabled: ${dedup.enabled}`);
      console.log(`dedup.window: ${dedup.windowHours}h`);
      console.log(`dedup.threshold_long: ${dedup.thresholdLong}`);
      console.log(`dedup.threshold_short: ${dedup.thresholdShort}`);
    });

  config
    .command('set <key> <value>')
    .description('Set a config value (dedup.enabled, dedup.window, dedup.threshold_long, dedup.threshold_short)')
    .action(async (key: string, value: string) => {
      const update: Partial<DedupConfig> = {};
      switch (key) {
        case 'dedup.enabled':
          if (value !== 'true' && value !== 'false') {
            console.error('Value must be true or false');
            process.exit(1);
          }
          update.enabled = value === 'true';
          break;
        case 'dedup.window':
          update.windowHours = parseInt(value, 10);
          if (isNaN(update.windowHours) || update.windowHours < 1) {
            console.error('Window must be a positive integer (hours)');
            process.exit(1);
          }
          break;
        case 'dedup.threshold_long':
          update.thresholdLong = parseFloat(value);
          if (isNaN(update.thresholdLong) || update.thresholdLong < 0 || update.thresholdLong > 1) {
            console.error('Threshold must be between 0 and 1');
            process.exit(1);
          }
          break;
        case 'dedup.threshold_short':
          update.thresholdShort = parseFloat(value);
          if (isNaN(update.thresholdShort) || update.thresholdShort < 0 || update.thresholdShort > 1) {
            console.error('Threshold must be between 0 and 1');
            process.exit(1);
          }
          break;
        default:
          console.error(`Unknown key: ${key}`);
          console.error('Valid keys: dedup.enabled, dedup.window, dedup.threshold_long, dedup.threshold_short');
          process.exit(1);
      }
      await saveDedupConfig(update);
      console.log(`Set ${key} = ${value}`);
    });
}
