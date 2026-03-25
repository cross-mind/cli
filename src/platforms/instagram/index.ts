/**
 * Instagram platform adapter.
 * Uses Instagram's unofficial API with session cookie auth.
 * Auth: crossmind extract-cookie instagram
 * Commands: profile, feed (user posts)
 * Note: Instagram's private API may change. Read-only.
 */

import { Command } from 'commander';
import { request } from '../../http/client.js';
import { printOutput } from '../../output/formatter.js';
import { loadCredential, resolveAccount } from '../../auth/store.js';
import { AuthError } from '../../http/client.js';

const IG_API = 'https://www.instagram.com';

interface IGPost {
  rank: number;
  id: string;
  caption: string;
  likes: number;
  comments: number;
  media_type: string;
  taken_at: string;
  url: string;
}

interface IGProfile {
  rank: number;
  username: string;
  full_name: string;
  followers: number;
  following: number;
  posts: number;
  bio: string;
  is_private: string;
  url: string;
}

async function getIgHeaders(account?: string, dataDir?: string): Promise<Record<string, string>> {
  const name = await resolveAccount('instagram', account, dataDir);
  const cred = await loadCredential('instagram', name, dataDir);
  if (!cred?.cookie) {
    throw new AuthError('Instagram credentials required. Run: crossmind extract-cookie instagram');
  }

  const csrfToken = cred.cookie.match(/csrftoken=([^;]+)/)?.[1] ?? '';
  return {
    'Cookie': cred.cookie,
    'X-CSRFToken': csrfToken,
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'X-IG-App-ID': '936619743392459',
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': 'https://www.instagram.com/',
  };
}

async function getUserProfile(username: string, account?: string, dataDir?: string): Promise<IGProfile | null> {
  const headers = await getIgHeaders(account, dataDir);
  const data = await request<{ data: { user: Record<string, unknown> } }>(
    `${IG_API}/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
    { headers }
  );

  const user = data?.data?.user;
  if (!user) return null;

  return {
    rank: 1,
    username: String(user['username'] ?? ''),
    full_name: String(user['full_name'] ?? ''),
    followers: Number((user['edge_followed_by'] as { count: number } | null)?.count ?? 0),
    following: Number((user['edge_follow'] as { count: number } | null)?.count ?? 0),
    posts: Number((user['edge_owner_to_timeline_media'] as { count: number } | null)?.count ?? 0),
    bio: String(user['biography'] ?? '').slice(0, 160),
    is_private: String(user['is_private'] ?? false),
    url: `https://www.instagram.com/${user['username']}/`,
  };
}

async function getUserPosts(username: string, limit: number, account?: string, dataDir?: string): Promise<IGPost[]> {
  const headers = await getIgHeaders(account, dataDir);
  const profileData = await request<{ data: { user: { id: string } } }>(
    `${IG_API}/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
    { headers }
  );

  const userId = profileData?.data?.user?.id;
  if (!userId) return [];

  const data = await request<{
    data: { user: { edge_owner_to_timeline_media: { edges: Array<{ node: Record<string, unknown> }> } } };
  }>(
    `${IG_API}/graphql/query/?query_hash=e769aa130647d2354c40ea6a439bfc08&variables=${encodeURIComponent(JSON.stringify({ id: userId, first: Math.min(limit, 50) }))}`,
    { headers }
  );

  const edges = data?.data?.user?.edge_owner_to_timeline_media?.edges ?? [];
  return edges.slice(0, limit).map((edge, i) => {
    const node = edge.node;
    const caption = ((node['edge_media_to_caption'] as { edges: Array<{ node: { text: string } }> } | null)?.edges?.[0]?.node?.text ?? '').slice(0, 200);
    const timestamp = Number(node['taken_at_timestamp'] ?? 0);

    return {
      rank: i + 1,
      id: String(node['id'] ?? ''),
      caption: caption.replace(/\n/g, ' '),
      likes: Number((node['edge_liked_by'] as { count: number } | null)?.count ?? 0),
      comments: Number((node['edge_media_to_comment'] as { count: number } | null)?.count ?? 0),
      media_type: String(node['__typename'] ?? '').replace('Graph', '').toLowerCase(),
      taken_at: timestamp ? new Date(timestamp * 1000).toISOString().slice(0, 10) : '',
      url: `https://www.instagram.com/p/${node['shortcode']}/`,
    };
  });
}

const POST_TEMPLATE = '{rank}. [{media_type}] likes:{likes} comments:{comments} ({taken_at}) — {caption} {url}';
const PROFILE_TEMPLATE = '{rank}. @{username} ({full_name}) followers:{followers} following:{following} posts:{posts} private:{is_private} — {bio}';

export function registerInstagram(program: Command): void {
  const ig = program
    .command('ig')
    .description('Instagram — profile, user posts (requires cookie auth)');

  ig
    .command('profile <username>')
    .description("Get a user's Instagram profile")
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .option('--json', 'Output as JSON array')
    .action(async (username: string, opts: { account?: string; dataDir?: string; json?: boolean }) => {
      const start = Date.now();
      try {
        const profile = await getUserProfile(username, opts.account, opts.dataDir);
        if (!profile) {
          console.error(`User not found: ${username}`);
          process.exit(1);
        }
        printOutput([profile] as unknown as Record<string, unknown>[], PROFILE_TEMPLATE, `ig/profile/${username}`, start, { json: opts.json });
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  ig
    .command('posts <username> [limit]')
    .description("Get a user's recent posts")
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .option('--json', 'Output as JSON array')
    .action(async (username: string, limitArg: string | undefined, opts: { account?: string; dataDir?: string; json?: boolean }) => {
      const start = Date.now();
      const limit = limitArg ? parseInt(limitArg, 10) : 12;
      try {
        const items = await getUserPosts(username, limit, opts.account, opts.dataDir);
        printOutput(items as unknown as Record<string, unknown>[], POST_TEMPLATE, `ig/posts/${username}`, start, { json: opts.json });
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
