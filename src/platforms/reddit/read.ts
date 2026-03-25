/**
 * Reddit read operations.
 * Subreddit listings, search, user profile, saved posts.
 */

import { request } from '../../http/client.js';
import { getRedditToken, REDDIT_API, redditHeaders } from '../../auth/reddit.js';

export interface RedditPost {
  rank: number;
  id: string;
  title: string;
  author: string;
  subreddit: string;
  score: number;
  comments: number;
  url: string;
  domain: string;
  created_utc: number;
  flair: string;
}

export interface RedditComment {
  rank: number;
  id: string;
  author: string;
  body: string;
  score: number;
  subreddit: string;
  url: string;
}

function mapPost(child: Record<string, unknown>, index: number): RedditPost {
  const data = child['data'] as Record<string, unknown> ?? child;
  return {
    rank: index + 1,
    id: String(data['id'] ?? ''),
    title: String(data['title'] ?? '').slice(0, 150),
    author: String(data['author'] ?? ''),
    subreddit: String(data['subreddit'] ?? ''),
    score: Number(data['score'] ?? 0),
    comments: Number(data['num_comments'] ?? 0),
    url: String(data['url'] ?? ''),
    domain: String(data['domain'] ?? ''),
    created_utc: Number(data['created_utc'] ?? 0),
    flair: String(data['link_flair_text'] ?? ''),
  };
}

/** Fetch subreddit listing (hot/new/top/rising) */
export async function getSubreddit(
  subreddit: string,
  sort: 'hot' | 'new' | 'top' | 'rising',
  limit: number,
  time: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all',
  account?: string,
  dataDir?: string
): Promise<RedditPost[]> {
  let token: string | undefined;
  let baseUrl: string;

  try {
    token = await getRedditToken(account, dataDir);
    baseUrl = REDDIT_API;
  } catch {
    // Fall back to public API
    baseUrl = 'https://www.reddit.com';
  }

  const timeParam = sort === 'top' ? `&t=${time}` : '';
  const url = `${baseUrl}/r/${subreddit}/${sort}.json?limit=${Math.min(limit, 100)}${timeParam}`;

  const data = await request<{ data: { children: Record<string, unknown>[] } }>(
    url,
    { headers: token ? redditHeaders(token) : { 'User-Agent': 'crossmind-cli/1.0' } }
  );

  const posts = data.data.children ?? [];
  return posts.slice(0, limit).map((child, i) => mapPost(child, i));
}

/** Search Reddit */
export async function searchReddit(
  query: string,
  subreddit: string | undefined,
  sort: 'relevance' | 'new' | 'top' | 'comments',
  limit: number,
  account?: string,
  dataDir?: string
): Promise<RedditPost[]> {
  let token: string | undefined;
  let baseUrl: string;

  try {
    token = await getRedditToken(account, dataDir);
    baseUrl = REDDIT_API;
  } catch {
    baseUrl = 'https://www.reddit.com';
  }

  const subredditPath = subreddit ? `/r/${subreddit}` : '';
  const url = `${baseUrl}${subredditPath}/search.json?q=${encodeURIComponent(query)}&sort=${sort}&limit=${Math.min(limit, 100)}&restrict_sr=${subreddit ? 'true' : 'false'}`;

  const data = await request<{ data: { children: Record<string, unknown>[] } }>(
    url,
    { headers: token ? redditHeaders(token) : { 'User-Agent': 'crossmind-cli/1.0' } }
  );

  return (data.data.children ?? []).slice(0, limit).map((child, i) => mapPost(child, i));
}

/** Get post comments */
export async function getPostComments(
  subreddit: string,
  postId: string,
  limit: number,
  account?: string,
  dataDir?: string
): Promise<RedditComment[]> {
  let token: string | undefined;
  let baseUrl: string;

  try {
    token = await getRedditToken(account, dataDir);
    baseUrl = REDDIT_API;
  } catch {
    baseUrl = 'https://www.reddit.com';
  }

  const url = `${baseUrl}/r/${subreddit}/comments/${postId}.json?limit=${Math.min(limit, 100)}`;
  const data = await request<[unknown, { data: { children: Record<string, unknown>[] } }]>(
    url,
    { headers: token ? redditHeaders(token) : { 'User-Agent': 'crossmind-cli/1.0' } }
  );

  const children = data[1]?.data?.children ?? [];
  const results: RedditComment[] = [];
  let rank = 1;

  for (const child of children) {
    const d = (child as { data?: Record<string, unknown> }).data ?? {};
    if (d['body'] && d['body'] !== '[deleted]') {
      results.push({
        rank: rank++,
        id: String(d['id'] ?? ''),
        author: String(d['author'] ?? ''),
        body: String(d['body'] ?? '').replace(/\n/g, ' ').slice(0, 200),
        score: Number(d['score'] ?? 0),
        subreddit: String(d['subreddit'] ?? ''),
        url: `https://reddit.com${d['permalink'] ?? ''}`,
      });
      if (results.length >= limit) break;
    }
  }

  return results;
}
