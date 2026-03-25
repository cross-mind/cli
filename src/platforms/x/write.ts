/**
 * X (Twitter) write operations.
 * Post, reply, like, retweet, follow, dm, delete.
 * All require auth_token + ct0 cookie credentials.
 */

import { xRequest } from '../../http/x-client.js';
import { loadXCredentials } from '../../auth/x.js';
import { checkWriteLimit, writeDelay } from '../../http/rate-limiter.js';
import { AuthError } from '../../http/client.js';

async function getXCreds(account?: string, dataDir?: string) {
  const creds = await loadXCredentials(account, dataDir);
  if (!creds?.authToken || !creds?.ct0) {
    throw new AuthError('X write operations require cookie auth. Run: crossmind auth login x --auth-token <token> --ct0 <ct0>');
  }
  return { authToken: creds.authToken, ct0: creds.ct0 };
}

export interface WriteResult {
  success: boolean;
  id?: string;
  message: string;
}

/** Post a new tweet */
export async function postTweet(
  text: string,
  account?: string,
  dataDir?: string
): Promise<WriteResult> {
  await checkWriteLimit('x', 'post', dataDir);
  const creds = await getXCreds(account, dataDir);
  await writeDelay();

  const data = await xRequest<{ data: { id: string; text: string } }>(
    '/2/tweets',
    { method: 'POST', creds, body: { text } }
  );

  return {
    success: true,
    id: data.data.id,
    message: `posted:${data.data.id} text:${text.slice(0, 50)}${text.length > 50 ? '...' : ''}`,
  };
}

/** Reply to a tweet */
export async function replyToTweet(
  text: string,
  tweetId: string,
  account?: string,
  dataDir?: string
): Promise<WriteResult> {
  await checkWriteLimit('x', 'reply', dataDir);
  const creds = await getXCreds(account, dataDir);
  await writeDelay();

  const data = await xRequest<{ data: { id: string } }>(
    '/2/tweets',
    {
      method: 'POST',
      creds,
      body: { text, reply: { in_reply_to_tweet_id: tweetId } },
    }
  );

  return {
    success: true,
    id: data.data.id,
    message: `replied:${data.data.id} to:${tweetId}`,
  };
}

/** Like a tweet */
export async function likeTweet(
  tweetId: string,
  account?: string,
  dataDir?: string
): Promise<WriteResult> {
  await checkWriteLimit('x', 'like', dataDir);
  const creds = await getXCreds(account, dataDir);
  await writeDelay();

  // Need authenticated user's ID first
  const meData = await xRequest<{ data: { id: string } }>(
    '/2/users/me',
    { creds }
  );
  const userId = meData.data.id;

  await xRequest(
    `/2/users/${userId}/likes`,
    { method: 'POST', creds, body: { tweet_id: tweetId } }
  );

  return { success: true, message: `liked:${tweetId}` };
}

/** Retweet */
export async function retweetTweet(
  tweetId: string,
  account?: string,
  dataDir?: string
): Promise<WriteResult> {
  await checkWriteLimit('x', 'retweet', dataDir);
  const creds = await getXCreds(account, dataDir);
  await writeDelay();

  const meData = await xRequest<{ data: { id: string } }>(
    '/2/users/me',
    { creds }
  );
  const userId = meData.data.id;

  await xRequest(
    `/2/users/${userId}/retweets`,
    { method: 'POST', creds, body: { tweet_id: tweetId } }
  );

  return { success: true, message: `retweeted:${tweetId}` };
}

/** Follow a user by username */
export async function followUser(
  username: string,
  account?: string,
  dataDir?: string
): Promise<WriteResult> {
  await checkWriteLimit('x', 'follow', dataDir);
  const creds = await getXCreds(account, dataDir);
  await writeDelay();

  const meData = await xRequest<{ data: { id: string } }>(
    '/2/users/me',
    { creds }
  );
  const myId = meData.data.id;

  const targetData = await xRequest<{ data: { id: string } }>(
    `/2/users/by/username/${username}`,
    { creds }
  );
  const targetId = targetData.data.id;

  await xRequest(
    `/2/users/${myId}/following`,
    { method: 'POST', creds, body: { target_user_id: targetId } }
  );

  return { success: true, message: `following:@${username}` };
}

/** Send a DM */
export async function sendDM(
  username: string,
  text: string,
  account?: string,
  dataDir?: string
): Promise<WriteResult> {
  await checkWriteLimit('x', 'dm', dataDir);
  const creds = await getXCreds(account, dataDir);
  await writeDelay();

  const targetData = await xRequest<{ data: { id: string } }>(
    `/2/users/by/username/${username}`,
    { creds }
  );
  const targetId = targetData.data.id;

  const data = await xRequest<{ data: { dm_conversation_id: string } }>(
    '/2/dm_conversations',
    {
      method: 'POST',
      creds,
      body: {
        participant_id: targetId,
        message: { text },
      },
    }
  );

  return {
    success: true,
    id: data.data.dm_conversation_id,
    message: `dm_sent to:@${username} text:${text.slice(0, 50)}`,
  };
}

/** Delete a tweet */
export async function deleteTweet(
  tweetId: string,
  account?: string,
  dataDir?: string
): Promise<WriteResult> {
  await checkWriteLimit('x', 'delete', dataDir);
  const creds = await getXCreds(account, dataDir);
  await writeDelay();

  await xRequest(
    `/2/tweets/${tweetId}`,
    { method: 'DELETE', creds }
  );

  return { success: true, message: `deleted:${tweetId}` };
}
