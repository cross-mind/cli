/**
 * Bluesky platform commands.
 * Read: timeline, search, feed, profile
 * Write: post, reply, like, repost, follow, delete
 */

import { Command } from 'commander';
import { getTimeline, searchPosts, getAuthorFeed, getProfile } from './read.js';
import { createPost, replyToPost, likePost, repost, followUser, deleteRecord } from './write.js';
import { printOutput } from '../../output/formatter.js';

const POST_TEMPLATE = '{rank}. @{author} likes:{likes} reposts:{reposts} replies:{replies} — {text} {url}';
const PROFILE_TEMPLATE = '{rank}. @{handle} ({display_name}) followers:{followers} following:{following} posts:{posts} — {bio}';

export function registerBluesky(program: Command): void {
  const bsky = program
    .command('bsky')
    .description('Bluesky — timeline, search, post, reply, like, follow');

  // ── Read commands ──────────────────────────────────────────────

  bsky
    .command('timeline [limit]')
    .description('Home timeline (requires auth)')
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .option('--json', 'Output as JSON array')
    .action(async (limitArg: string | undefined, opts: { account?: string; dataDir?: string; json?: boolean }) => {
      const start = Date.now();
      const limit = limitArg ? parseInt(limitArg, 10) : 20;
      try {
        const items = await getTimeline(limit, opts.account, opts.dataDir);
        printOutput(items as unknown as Record<string, unknown>[], POST_TEMPLATE, 'bsky/timeline', start, { json: opts.json });
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  bsky
    .command('search <query> [limit]')
    .description('Search posts')
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .option('--json', 'Output as JSON array')
    .action(async (query: string, limitArg: string | undefined, opts: { account?: string; dataDir?: string; json?: boolean }) => {
      const start = Date.now();
      const limit = limitArg ? parseInt(limitArg, 10) : 20;
      try {
        const items = await searchPosts(query, limit, opts.account, opts.dataDir);
        printOutput(items as unknown as Record<string, unknown>[], POST_TEMPLATE, 'bsky/search', start, { json: opts.json });
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  bsky
    .command('feed <handle> [limit]')
    .description("Get a user's posts")
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .option('--json', 'Output as JSON array')
    .action(async (handle: string, limitArg: string | undefined, opts: { account?: string; dataDir?: string; json?: boolean }) => {
      const start = Date.now();
      const limit = limitArg ? parseInt(limitArg, 10) : 20;
      try {
        const items = await getAuthorFeed(handle, limit, opts.account, opts.dataDir);
        printOutput(items as unknown as Record<string, unknown>[], POST_TEMPLATE, `bsky/feed/${handle}`, start, { json: opts.json });
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  bsky
    .command('profile <handle>')
    .description("Get a user's profile")
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .option('--json', 'Output as JSON array')
    .action(async (handle: string, opts: { account?: string; dataDir?: string; json?: boolean }) => {
      const start = Date.now();
      try {
        const profile = await getProfile(handle, opts.account, opts.dataDir);
        if (!profile) {
          console.error(`Profile not found: ${handle}`);
          process.exit(1);
        }
        printOutput([profile] as unknown as Record<string, unknown>[], PROFILE_TEMPLATE, `bsky/profile/${handle}`, start, { json: opts.json });
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  // ── Write commands ─────────────────────────────────────────────

  bsky
    .command('post <text>')
    .description('Post to Bluesky')
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .option('-f, --force', 'Skip duplicate content check')
    .action(async (text: string, opts: { account?: string; dataDir?: string; force?: boolean }) => {
      try {
        const result = await createPost(text, opts.account, opts.dataDir, !!opts.force);
        console.log(result.message);
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  bsky
    .command('reply <post_uri> <post_cid> <text>')
    .description('Reply to a post (provide URI and CID)')
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .option('-f, --force', 'Skip duplicate content check')
    .action(async (postUri: string, postCid: string, text: string, opts: { account?: string; dataDir?: string; force?: boolean }) => {
      try {
        const result = await replyToPost(text, postUri, postCid, postUri, postCid, opts.account, opts.dataDir, !!opts.force);
        console.log(result.message);
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  bsky
    .command('like <post_uri> <post_cid>')
    .description('Like a post')
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .action(async (postUri: string, postCid: string, opts: { account?: string; dataDir?: string }) => {
      try {
        const result = await likePost(postUri, postCid, opts.account, opts.dataDir);
        console.log(result.message);
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  bsky
    .command('repost <post_uri> <post_cid>')
    .description('Repost a post')
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .action(async (postUri: string, postCid: string, opts: { account?: string; dataDir?: string }) => {
      try {
        const result = await repost(postUri, postCid, opts.account, opts.dataDir);
        console.log(result.message);
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  bsky
    .command('follow <handle>')
    .description('Follow a user')
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .action(async (handle: string, opts: { account?: string; dataDir?: string }) => {
      try {
        const result = await followUser(handle, opts.account, opts.dataDir);
        console.log(result.message);
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  bsky
    .command('delete <uri>')
    .description('Delete a record (post, like, repost, follow) by URI')
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .action(async (uri: string, opts: { account?: string; dataDir?: string }) => {
      try {
        const result = await deleteRecord(uri, opts.account, opts.dataDir);
        console.log(result.message);
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
