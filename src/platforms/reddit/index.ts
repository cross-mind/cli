/**
 * Reddit platform commands.
 * Read: subreddit, search, comments
 * Write: comment, vote, save, subscribe, post
 */

import { Command } from 'commander';
import { getSubreddit, searchReddit, getPostComments } from './read.js';
import { submitComment, vote, saveItem, subscribeSubreddit, submitPost } from './write.js';
import { printOutput } from '../../output/formatter.js';

const POST_TEMPLATE = '{rank}. r/{subreddit} score:{score} comments:{comments} [{flair}] {title} — {url}';
const COMMENT_TEMPLATE = '{rank}. u/{author} score:{score} — {body} {url}';

export function registerReddit(program: Command): void {
  const reddit = program
    .command('reddit')
    .description('Reddit — subreddits, search, comment, vote, subscribe');

  // ── Read commands ──────────────────────────────────────────────

  reddit
    .command('r <subreddit> [limit]')
    .description('Browse a subreddit')
    .option('--sort <sort>', 'Sort: hot, new, top, rising (default: hot)', 'hot')
    .option('--time <time>', 'Time filter for top: hour, day, week, month, year, all (default: day)', 'day')
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .option('--json', 'Output as JSON array')
    .action(async (
      subreddit: string,
      limitArg: string | undefined,
      opts: { sort: string; time: string; account?: string; dataDir?: string; json?: boolean }
    ) => {
      const start = Date.now();
      const limit = limitArg ? parseInt(limitArg, 10) : 25;
      try {
        const items = await getSubreddit(subreddit, opts.sort as 'hot', limit, opts.time as 'day', opts.account, opts.dataDir);
        printOutput(items as unknown as Record<string, unknown>[], POST_TEMPLATE, `reddit/r/${subreddit}`, start, { json: opts.json });
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  reddit
    .command('search <query> [limit]')
    .description('Search Reddit posts')
    .option('--sub <subreddit>', 'Restrict search to a subreddit')
    .option('--sort <sort>', 'Sort: relevance, new, top, comments (default: relevance)', 'relevance')
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .option('--json', 'Output as JSON array')
    .action(async (
      query: string,
      limitArg: string | undefined,
      opts: { sub?: string; sort: string; account?: string; dataDir?: string; json?: boolean }
    ) => {
      const start = Date.now();
      const limit = limitArg ? parseInt(limitArg, 10) : 25;
      try {
        const items = await searchReddit(query, opts.sub, opts.sort as 'relevance', limit, opts.account, opts.dataDir);
        printOutput(items as unknown as Record<string, unknown>[], POST_TEMPLATE, 'reddit/search', start, { json: opts.json });
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  reddit
    .command('comments <subreddit> <post_id> [limit]')
    .description('Get comments for a post (post_id from URL, e.g. abc123)')
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .option('--json', 'Output as JSON array')
    .action(async (
      subreddit: string,
      postId: string,
      limitArg: string | undefined,
      opts: { account?: string; dataDir?: string; json?: boolean }
    ) => {
      const start = Date.now();
      const limit = limitArg ? parseInt(limitArg, 10) : 25;
      try {
        const items = await getPostComments(subreddit, postId, limit, opts.account, opts.dataDir);
        printOutput(items as unknown as Record<string, unknown>[], COMMENT_TEMPLATE, `reddit/comments/${postId}`, start, { json: opts.json });
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  // ── Write commands ─────────────────────────────────────────────

  reddit
    .command('comment <parent_id> <text>')
    .description('Submit a comment (parent_id: t3_<post_id> or t1_<comment_id>)')
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .action(async (parentId: string, text: string, opts: { account?: string; dataDir?: string }) => {
      try {
        const result = await submitComment(parentId, text, opts.account, opts.dataDir);
        console.log(result.message);
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  reddit
    .command('upvote <id>')
    .description('Upvote a post or comment (fullname: t3_xxx or t1_xxx)')
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .action(async (id: string, opts: { account?: string; dataDir?: string }) => {
      try {
        const result = await vote(id, 1, opts.account, opts.dataDir);
        console.log(result.message);
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  reddit
    .command('downvote <id>')
    .description('Downvote a post or comment')
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .action(async (id: string, opts: { account?: string; dataDir?: string }) => {
      try {
        const result = await vote(id, -1, opts.account, opts.dataDir);
        console.log(result.message);
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  reddit
    .command('save <id>')
    .description('Save a post or comment')
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .action(async (id: string, opts: { account?: string; dataDir?: string }) => {
      try {
        const result = await saveItem(id, opts.account, opts.dataDir);
        console.log(result.message);
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  reddit
    .command('subscribe <subreddit>')
    .description('Subscribe to a subreddit')
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .action(async (subreddit: string, opts: { account?: string; dataDir?: string }) => {
      try {
        const result = await subscribeSubreddit(subreddit, 'sub', opts.account, opts.dataDir);
        console.log(result.message);
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  reddit
    .command('post <subreddit> <title> <url>')
    .description('Submit a link post to a subreddit')
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .action(async (subreddit: string, title: string, url: string, opts: { account?: string; dataDir?: string }) => {
      try {
        const result = await submitPost(subreddit, title, url, opts.account, opts.dataDir);
        console.log(result.message);
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
