/**
 * Reddit authentication.
 * Uses OAuth 2.0 PKCE (public client, no secret).
 * Access token is short-lived; refresh token is permanent.
 */

import open from 'open';
import {
  generateCodeVerifier, generateCodeChallenge, generateState,
  buildAuthUrl, exchangeCode, refreshToken, captureCallback, type OAuthConfig,
} from './oauth.js';
import { saveCredential, loadCredential, resolveAccount } from './store.js';
import { AuthError } from '../http/client.js';

export const REDDIT_CLIENT_ID = process.env['REDDIT_CLIENT_ID'] ?? 'YOUR_REDDIT_CLIENT_ID';
const REDDIT_REDIRECT_PORT = 7879;
const REDDIT_REDIRECT_URI = `http://127.0.0.1:${REDDIT_REDIRECT_PORT}/callback`;
const REDDIT_UA = 'crossmind-cli/1.0 (crossmind.io)';

const REDDIT_OAUTH_CONFIG: OAuthConfig = {
  clientId: REDDIT_CLIENT_ID,
  redirectUri: REDDIT_REDIRECT_URI,
  authorizationUrl: 'https://www.reddit.com/api/v1/authorize',
  tokenUrl: 'https://www.reddit.com/api/v1/access_token',
  scopes: ['read', 'submit', 'vote', 'save', 'subscribe', 'history', 'identity', 'mysubreddits'],
};

/**
 * Run the Reddit OAuth 2.0 PKCE flow.
 */
export async function loginReddit(accountName: string, dataDir?: string): Promise<void> {
  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);
  const state = generateState();

  const authUrl = buildAuthUrl(REDDIT_OAUTH_CONFIG, state, challenge) + '&duration=permanent';
  console.log(`Opening browser for Reddit authorization...`);
  console.log(`If browser does not open, visit:\n${authUrl}`);
  await open(authUrl);

  console.log(`Waiting for OAuth callback on port ${REDDIT_REDIRECT_PORT}...`);
  const code = await captureCallback(REDDIT_REDIRECT_PORT, state);

  const tokens = await exchangeCode(REDDIT_OAUTH_CONFIG, code, verifier);
  const expiresAt = tokens.expires_in
    ? Date.now() + tokens.expires_in * 1000
    : undefined;

  await saveCredential({
    platform: 'reddit',
    name: accountName,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt,
  }, dataDir);

  console.log(`Reddit account saved as "${accountName}".`);
}

/**
 * Get a valid Reddit access token, refreshing if expired.
 */
export async function getRedditToken(account?: string, dataDir?: string): Promise<string> {
  const name = await resolveAccount('reddit', account, dataDir);
  const cred = await loadCredential('reddit', name, dataDir);
  if (!cred?.accessToken) {
    throw new AuthError('No Reddit credentials. Run: crossmind auth login reddit');
  }

  // Refresh if expired (with 60s buffer)
  if (cred.expiresAt && Date.now() > cred.expiresAt - 60_000 && cred.refreshToken) {
    const tokens = await refreshToken(REDDIT_OAUTH_CONFIG, cred.refreshToken);
    const updated = {
      ...cred,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? cred.refreshToken,
      expiresAt: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : cred.expiresAt,
    };
    await saveCredential(updated, dataDir);
    return updated.accessToken!;
  }

  return cred.accessToken;
}

/** Reddit API base URL */
export const REDDIT_API = 'https://oauth.reddit.com';

/** Build headers for Reddit API calls */
export function redditHeaders(token: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${token}`,
    'User-Agent': REDDIT_UA,
  };
}
