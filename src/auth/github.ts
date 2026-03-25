/**
 * GitHub authentication.
 * Uses a personal access token (PAT) or fine-grained token.
 * No OAuth flow needed — users paste their token directly.
 */

import { saveCredential, loadCredential, resolveAccount } from './store.js';
import { AuthError } from '../http/client.js';

export const GITHUB_API = 'https://api.github.com';

/**
 * Save a GitHub personal access token.
 */
export async function saveGitHubToken(
  accountName: string,
  token: string,
  dataDir?: string
): Promise<void> {
  // Validate token by fetching authenticated user
  const res = await fetch(`${GITHUB_API}/user`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
    },
  });

  if (res.status === 401) {
    throw new AuthError('Invalid GitHub token.');
  }
  if (!res.ok) {
    throw new AuthError(`GitHub token validation failed: HTTP ${res.status}`);
  }

  const user = await res.json() as { login: string };

  await saveCredential({
    platform: 'gh',
    name: accountName,
    apiToken: token,
    handle: user.login,
  }, dataDir);

  console.log(`GitHub account ${user.login} saved as "${accountName}".`);
}

/**
 * Get GitHub API token for an account.
 * Returns undefined if no token is stored (for public API access).
 */
export async function getGitHubToken(account?: string, dataDir?: string): Promise<string | undefined> {
  const name = await resolveAccount('gh', account, dataDir);
  const cred = await loadCredential('gh', name, dataDir);
  return cred?.apiToken;
}

/** Build headers for GitHub API calls */
export function githubHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}
