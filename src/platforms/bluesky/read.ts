/**
 * Bluesky (ATProto) read operations.
 * Timeline, search, profile, feed.
 */

import { request } from '../../http/client.js';
import { getBskyToken, bskyHeaders, BSKY_API } from '../../auth/bluesky.js';

const BSKY_XRPC = `${BSKY_API}/xrpc`;

export interface BskyPost {
  rank: number;
  uri: string;
  cid: string;
  author: string;
  text: string;
  likes: number;
  reposts: number;
  replies: number;
  created_at: string;
  url: string;
}

export interface BskyProfile {
  rank: number;
  handle: string;
  display_name: string;
  followers: number;
  following: number;
  posts: number;
  bio: string;
  url: string;
}

function buildPostUrl(handle: string, uri: string): string {
  const rkey = uri.split('/').pop() ?? '';
  return `https://bsky.app/profile/${handle}/post/${rkey}`;
}

function mapPost(post: Record<string, unknown>, index: number): BskyPost {
  const record = post['record'] as Record<string, unknown> | null ?? {};
  const author = post['author'] as Record<string, unknown> | null ?? {};
  const counts = post['likeCount'] !== undefined ? post : {} as Record<string, unknown>;
  const handle = String(author['handle'] ?? '');
  const uri = String(post['uri'] ?? '');

  return {
    rank: index + 1,
    uri,
    cid: String(post['cid'] ?? ''),
    author: handle,
    text: String(record['text'] ?? '').replace(/\n/g, ' ').slice(0, 200),
    likes: Number(post['likeCount'] ?? counts['likeCount'] ?? 0),
    reposts: Number(post['repostCount'] ?? 0),
    replies: Number(post['replyCount'] ?? 0),
    created_at: String(record['createdAt'] ?? '').slice(0, 10),
    url: buildPostUrl(handle, uri),
  };
}

/** Get home timeline (requires auth) */
export async function getTimeline(
  limit: number,
  account?: string,
  dataDir?: string
): Promise<BskyPost[]> {
  const { token } = await getBskyToken(account, dataDir);

  const data = await request<{ feed: Array<{ post: Record<string, unknown> }> }>(
    `${BSKY_XRPC}/app.bsky.feed.getTimeline?limit=${Math.min(limit, 100)}`,
    { headers: bskyHeaders(token) }
  );

  return (data.feed ?? []).slice(0, limit).map((item, i) => mapPost(item.post, i));
}

/** Search posts */
export async function searchPosts(
  query: string,
  limit: number,
  account?: string,
  dataDir?: string
): Promise<BskyPost[]> {
  const { token } = await getBskyToken(account, dataDir);

  const params = new URLSearchParams({ q: query, limit: String(Math.min(limit, 100)) });
  const data = await request<{ posts: Record<string, unknown>[] }>(
    `${BSKY_XRPC}/app.bsky.feed.searchPosts?${params}`,
    { headers: bskyHeaders(token) }
  );

  return (data.posts ?? []).slice(0, limit).map((post, i) => mapPost(post, i));
}

/** Get author feed */
export async function getAuthorFeed(
  handle: string,
  limit: number,
  account?: string,
  dataDir?: string
): Promise<BskyPost[]> {
  const { token } = await getBskyToken(account, dataDir);

  const params = new URLSearchParams({ actor: handle, limit: String(Math.min(limit, 100)) });
  const data = await request<{ feed: Array<{ post: Record<string, unknown> }> }>(
    `${BSKY_XRPC}/app.bsky.feed.getAuthorFeed?${params}`,
    { headers: bskyHeaders(token) }
  );

  return (data.feed ?? []).slice(0, limit).map((item, i) => mapPost(item.post, i));
}

/** Get a user profile */
export async function getProfile(
  handle: string,
  account?: string,
  dataDir?: string
): Promise<BskyProfile | null> {
  const { token } = await getBskyToken(account, dataDir);

  const data = await request<Record<string, unknown>>(
    `${BSKY_XRPC}/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`,
    { headers: bskyHeaders(token) }
  );

  if (!data) return null;

  return {
    rank: 1,
    handle: String(data['handle'] ?? ''),
    display_name: String(data['displayName'] ?? ''),
    followers: Number(data['followersCount'] ?? 0),
    following: Number(data['followsCount'] ?? 0),
    posts: Number(data['postsCount'] ?? 0),
    bio: String(data['description'] ?? '').slice(0, 160),
    url: `https://bsky.app/profile/${data['handle']}`,
  };
}
