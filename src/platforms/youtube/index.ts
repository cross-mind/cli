/**
 * YouTube platform adapter.
 * Uses the YouTube Data API v3.
 * Requires an API key: crossmind auth login yt --token <api_key>
 * Read-only: search, trending, channel info.
 */

import { Command } from 'commander';
import { request } from '../../http/client.js';
import { printOutput } from '../../output/formatter.js';
import { loadCredential, resolveAccount } from '../../auth/store.js';
import { AuthError } from '../../http/client.js';

const YT_API = 'https://www.googleapis.com/youtube/v3';

interface YTVideo {
  rank: number;
  id: string;
  title: string;
  channel: string;
  views: number;
  likes: number;
  comments: number;
  published_at: string;
  duration: string;
  url: string;
}

interface YTChannel {
  rank: number;
  id: string;
  title: string;
  subscribers: number;
  views: number;
  videos: number;
  description: string;
  url: string;
}

async function getApiKey(account?: string, dataDir?: string): Promise<string> {
  const name = await resolveAccount('yt', account, dataDir);
  const cred = await loadCredential('yt', name, dataDir);
  if (!cred?.apiToken) {
    throw new AuthError('YouTube API key required. Run: crossmind auth login yt --token <api_key>');
  }
  return cred.apiToken;
}

async function searchVideos(query: string, limit: number, account?: string, dataDir?: string): Promise<YTVideo[]> {
  const key = await getApiKey(account, dataDir);
  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: String(Math.min(limit, 50)),
    key,
  });

  const searchData = await request<{
    items: Array<{ id: { videoId: string }; snippet: Record<string, unknown> }>;
  }>(`${YT_API}/search?${params}`);

  const videoIds = searchData.items.map((i) => i.id.videoId).join(',');
  if (!videoIds) return [];

  const statsParams = new URLSearchParams({
    part: 'statistics,contentDetails',
    id: videoIds,
    key,
  });
  const statsData = await request<{
    items: Array<{ id: string; statistics: Record<string, string>; contentDetails: Record<string, string> }>;
  }>(`${YT_API}/videos?${statsParams}`);

  const statsMap: Record<string, { statistics: Record<string, string>; contentDetails: Record<string, string> }> = {};
  for (const item of statsData.items ?? []) {
    statsMap[item.id] = { statistics: item.statistics, contentDetails: item.contentDetails };
  }

  return searchData.items.slice(0, limit).map((item, i) => {
    const videoId = item.id.videoId;
    const snippet = item.snippet;
    const stats = statsMap[videoId]?.statistics ?? {};
    return {
      rank: i + 1,
      id: videoId,
      title: String(snippet['title'] ?? '').slice(0, 100),
      channel: String(snippet['channelTitle'] ?? ''),
      views: Number(stats['viewCount'] ?? 0),
      likes: Number(stats['likeCount'] ?? 0),
      comments: Number(stats['commentCount'] ?? 0),
      published_at: String(snippet['publishedAt'] ?? '').slice(0, 10),
      duration: String(statsMap[videoId]?.contentDetails?.['duration'] ?? '').replace('PT', ''),
      url: `https://youtube.com/watch?v=${videoId}`,
    };
  });
}

async function getChannelInfo(channelId: string, account?: string, dataDir?: string): Promise<YTChannel | null> {
  const key = await getApiKey(account, dataDir);
  const params = new URLSearchParams({
    part: 'snippet,statistics',
    id: channelId,
    key,
  });

  const data = await request<{ items: Array<Record<string, unknown>> }>(
    `${YT_API}/channels?${params}`
  );

  const item = data.items?.[0];
  if (!item) return null;

  const snippet = item['snippet'] as Record<string, unknown> ?? {};
  const stats = item['statistics'] as Record<string, string> ?? {};
  return {
    rank: 1,
    id: String(item['id'] ?? ''),
    title: String(snippet['title'] ?? ''),
    subscribers: Number(stats['subscriberCount'] ?? 0),
    views: Number(stats['viewCount'] ?? 0),
    videos: Number(stats['videoCount'] ?? 0),
    description: String(snippet['description'] ?? '').slice(0, 160),
    url: `https://youtube.com/channel/${item['id']}`,
  };
}

const VIDEO_TEMPLATE = '{rank}. {title} — {channel} views:{views} likes:{likes} ({published_at}) {url}';
const CHANNEL_TEMPLATE = '{rank}. {title} subscribers:{subscribers} videos:{videos} views:{views} — {description}';

export function registerYouTube(program: Command): void {
  const yt = program
    .command('yt')
    .description('YouTube — search videos, channel info (requires API key)');

  yt
    .command('search <query> [limit]')
    .description('Search YouTube videos')
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .option('--json', 'Output as JSON array')
    .action(async (query: string, limitArg: string | undefined, opts: { account?: string; dataDir?: string; json?: boolean }) => {
      const start = Date.now();
      const limit = limitArg ? parseInt(limitArg, 10) : 10;
      try {
        const items = await searchVideos(query, limit, opts.account, opts.dataDir);
        printOutput(items as unknown as Record<string, unknown>[], VIDEO_TEMPLATE, 'yt/search', start, { json: opts.json });
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  yt
    .command('channel <channel_id>')
    .description('Get channel info by ID')
    .option('--account <name>', 'Account to use')
    .option('--data-dir <dir>', 'Data directory override')
    .option('--json', 'Output as JSON array')
    .action(async (channelId: string, opts: { account?: string; dataDir?: string; json?: boolean }) => {
      const start = Date.now();
      try {
        const info = await getChannelInfo(channelId, opts.account, opts.dataDir);
        if (!info) {
          console.error(`Channel not found: ${channelId}`);
          process.exit(1);
        }
        printOutput([info] as unknown as Record<string, unknown>[], CHANNEL_TEMPLATE, `yt/channel/${channelId}`, start, { json: opts.json });
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
