/**
 * X (Twitter) platform commands.
 * Read: search, timeline, home, profile
 * Write: post, reply, like, retweet, follow, dm, delete
 */

import { Command } from 'commander';
import { searchTweets, getUserTimeline, getUserProfile, getHomeTimeline } from './read.js';
import { postTweet, replyToTweet, likeTweet, retweetTweet, followUser, sendDM, deleteTweet } from './write.js';
import { printOutput } from '../../output/formatter.js';

const TWEET_TEMPLATE = '{rank}. @{author} likes:{likes} rt:{retweets} replies:{replies} — {text} {url}';
const USER_TEMPLATE = '{rank}. @{username} ({name}) followers:{followers} following:{following} tweets:{tweets} — {bio}';

export function registerX(program: Command): void {
  const x = program
    .command('x')
    .description('X (Twitter) — search, timeline, post, reply, like, follow, dm');

  // ── Read commands ──────────────────────────────────────────────

  x
    .command('search <query> [limit]')
    .description('Search recent tweets (last 7 days)')
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .option('--json', 'Output as JSON array')
    .action(async (query: string, limitArg: string | undefined, opts: { account?: string; dataDir?: string; json?: boolean }) => {
      const start = Date.now();
      const limit = limitArg ? parseInt(limitArg, 10) : 20;
      try {
        const items = await searchTweets(query, limit, opts.account, opts.dataDir);
        printOutput(items as unknown as Record<string, unknown>[], TWEET_TEMPLATE, 'x/search', start, { json: opts.json });
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  x
    .command('timeline <username> [limit]')
    .description("Get a user's recent tweets")
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .option('--json', 'Output as JSON array')
    .action(async (username: string, limitArg: string | undefined, opts: { account?: string; dataDir?: string; json?: boolean }) => {
      const start = Date.now();
      const limit = limitArg ? parseInt(limitArg, 10) : 20;
      try {
        const items = await getUserTimeline(username, limit, opts.account, opts.dataDir);
        printOutput(items as unknown as Record<string, unknown>[], TWEET_TEMPLATE, `x/timeline/${username}`, start, { json: opts.json });
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  x
    .command('home [limit]')
    .description('Home timeline (requires auth)')
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .option('--json', 'Output as JSON array')
    .action(async (limitArg: string | undefined, opts: { account?: string; dataDir?: string; json?: boolean }) => {
      const start = Date.now();
      const limit = limitArg ? parseInt(limitArg, 10) : 20;
      try {
        const items = await getHomeTimeline(limit, opts.account, opts.dataDir);
        printOutput(items as unknown as Record<string, unknown>[], TWEET_TEMPLATE, 'x/home', start, { json: opts.json });
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  x
    .command('profile <username>')
    .description("Get a user's profile")
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .option('--json', 'Output as JSON array')
    .action(async (username: string, opts: { account?: string; dataDir?: string; json?: boolean }) => {
      const start = Date.now();
      try {
        const user = await getUserProfile(username, opts.account, opts.dataDir);
        if (!user) {
          console.error(`User @${username} not found.`);
          process.exit(1);
        }
        printOutput([user] as unknown as Record<string, unknown>[], USER_TEMPLATE, `x/profile/${username}`, start, { json: opts.json });
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  // ── Write commands ─────────────────────────────────────────────

  x
    .command('post <text>')
    .description('Post a new tweet')
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .action(async (text: string, opts: { account?: string; dataDir?: string }) => {
      try {
        const result = await postTweet(text, opts.account, opts.dataDir);
        console.log(result.message);
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  x
    .command('reply <tweet_id> <text>')
    .description('Reply to a tweet')
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .action(async (tweetId: string, text: string, opts: { account?: string; dataDir?: string }) => {
      try {
        const result = await replyToTweet(text, tweetId, opts.account, opts.dataDir);
        console.log(result.message);
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  x
    .command('like <tweet_id>')
    .description('Like a tweet')
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .action(async (tweetId: string, opts: { account?: string; dataDir?: string }) => {
      try {
        const result = await likeTweet(tweetId, opts.account, opts.dataDir);
        console.log(result.message);
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  x
    .command('retweet <tweet_id>')
    .description('Retweet a tweet')
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .action(async (tweetId: string, opts: { account?: string; dataDir?: string }) => {
      try {
        const result = await retweetTweet(tweetId, opts.account, opts.dataDir);
        console.log(result.message);
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  x
    .command('follow <username>')
    .description('Follow a user')
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .action(async (username: string, opts: { account?: string; dataDir?: string }) => {
      try {
        const result = await followUser(username, opts.account, opts.dataDir);
        console.log(result.message);
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  x
    .command('dm <username> <text>')
    .description('Send a direct message')
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .action(async (username: string, text: string, opts: { account?: string; dataDir?: string }) => {
      try {
        const result = await sendDM(username, text, opts.account, opts.dataDir);
        console.log(result.message);
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  x
    .command('delete <tweet_id>')
    .description('Delete a tweet')
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .action(async (tweetId: string, opts: { account?: string; dataDir?: string }) => {
      try {
        const result = await deleteTweet(tweetId, opts.account, opts.dataDir);
        console.log(result.message);
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
