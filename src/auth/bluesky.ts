/**
 * Bluesky (ATProto) authentication.
 * Uses app password to create a session and get an access JWT.
 */

import { saveCredential, loadCredential, resolveAccount } from './store.js';
import { AuthError } from '../http/client.js';

export const BSKY_API = 'https://bsky.social';
export const BSKY_PUBLIC_API = 'https://api.bsky.app';
const BSKY_PDS = `${BSKY_API}/xrpc`;

export interface BskySession {
  accessJwt: string;
  refreshJwt: string;
  handle: string;
  did: string;
}

/**
 * Create a Bluesky session using handle + app password.
 */
export async function createBskySession(handle: string, appPassword: string): Promise<BskySession> {
  const res = await fetch(`${BSKY_PDS}/com.atproto.server.createSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: handle, password: appPassword }),
  });

  if (res.status === 401) {
    throw new AuthError('Invalid Bluesky handle or app password.');
  }
  if (!res.ok) {
    throw new AuthError(`Bluesky auth failed: HTTP ${res.status}`);
  }

  return res.json() as Promise<BskySession>;
}

/**
 * Refresh an existing Bluesky session using the refresh JWT.
 */
export async function refreshBskySession(refreshJwt: string): Promise<BskySession> {
  const res = await fetch(`${BSKY_PDS}/com.atproto.server.refreshSession`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${refreshJwt}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new AuthError(`Bluesky session refresh failed: HTTP ${res.status}`);
  }

  return res.json() as Promise<BskySession>;
}

/**
 * Login to Bluesky with handle + app password, save credentials.
 */
export async function loginBluesky(
  accountName: string,
  handle: string,
  appPassword: string,
  dataDir?: string
): Promise<void> {
  const session = await createBskySession(handle, appPassword);

  await saveCredential({
    platform: 'bsky',
    name: accountName,
    accessToken: session.accessJwt,
    refreshToken: session.refreshJwt,
    appPassword,
    handle: session.handle,
    did: session.did,
  }, dataDir);

  console.log(`Bluesky account ${session.handle} saved as "${accountName}".`);
}

/**
 * Get a valid Bluesky access JWT, refreshing if needed.
 */
export async function getBskyToken(account?: string, dataDir?: string): Promise<{ token: string; did: string; handle: string }> {
  const name = await resolveAccount('bsky', account, dataDir);
  const cred = await loadCredential('bsky', name, dataDir);

  if (!cred) {
    throw new AuthError('No Bluesky credentials. Run: crossmind auth login bsky');
  }

  // Try to refresh session (re-login with app password if we have it)
  if (cred.appPassword && cred.handle) {
    try {
      const session = await createBskySession(cred.handle, cred.appPassword);
      const updated = {
        ...cred,
        accessToken: session.accessJwt,
        refreshToken: session.refreshJwt,
        did: session.did,
        handle: session.handle,
      };
      await saveCredential(updated, dataDir);
      return { token: session.accessJwt, did: session.did, handle: session.handle };
    } catch {
      // Fall through to use existing token
    }
  }

  if (!cred.accessToken) {
    throw new AuthError('No Bluesky access token. Run: crossmind auth login bsky');
  }

  return {
    token: cred.accessToken,
    did: cred.did ?? '',
    handle: cred.handle ?? '',
  };
}

/**
 * Like getBskyToken, but returns null instead of throwing when no credentials.
 * Use for read operations that support public API fallback.
 */
export async function tryGetBskyToken(
  account?: string,
  dataDir?: string
): Promise<{ token: string; did: string; handle: string } | null> {
  try {
    return await getBskyToken(account, dataDir);
  } catch {
    return null;
  }
}

/** Build headers for Bluesky API calls */
export function bskyHeaders(token: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}
