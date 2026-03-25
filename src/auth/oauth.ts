/**
 * OAuth 2.0 PKCE helper.
 * Used for X write-auth and Reddit.
 */

import { createHash, randomBytes } from 'node:crypto';
import http from 'node:http';
import { URL } from 'node:url';

/** Generate a cryptographically random code verifier (43-128 chars). */
export function generateCodeVerifier(): string {
  return randomBytes(64).toString('base64url').slice(0, 128);
}

/** Derive the PKCE code challenge (SHA-256, base64url). */
export function generateCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

/** Generate a random state string for CSRF protection. */
export function generateState(): string {
  return randomBytes(24).toString('hex');
}

export interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
  scope?: string;
}

/**
 * Build the OAuth 2.0 PKCE authorization URL.
 */
export function buildAuthUrl(
  config: OAuthConfig,
  state: string,
  codeChallenge: string
): string {
  const url = new URL(config.authorizationUrl);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', config.scopes.join(' '));
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

/**
 * Exchange authorization code for tokens.
 */
export async function exchangeCode(
  config: OAuthConfig,
  code: string,
  codeVerifier: string,
  clientSecret?: string
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.clientId,
    code,
    redirect_uri: config.redirectUri,
    code_verifier: codeVerifier,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  if (clientSecret) {
    const creds = Buffer.from(`${config.clientId}:${clientSecret}`).toString('base64');
    headers['Authorization'] = `Basic ${creds}`;
  }

  const res = await fetch(config.tokenUrl, {
    method: 'POST',
    headers,
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<TokenResponse>;
}

/**
 * Refresh an OAuth access token using a refresh token.
 */
export async function refreshToken(
  config: OAuthConfig,
  refreshTok: string,
  clientSecret?: string
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshTok,
    client_id: config.clientId,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  if (clientSecret) {
    const creds = Buffer.from(`${config.clientId}:${clientSecret}`).toString('base64');
    headers['Authorization'] = `Basic ${creds}`;
  }

  const res = await fetch(config.tokenUrl, {
    method: 'POST',
    headers,
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<TokenResponse>;
}

/**
 * Spin up a local HTTP server to capture the OAuth redirect code.
 * Returns the authorization code (or rejects on timeout/error).
 */
export async function captureCallback(
  port: number,
  expectedState: string,
  timeoutMs = 120_000
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      server.close();
      reject(new Error('OAuth callback timeout (2 min)'));
    }, timeoutMs);

    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost:${port}`);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body><h2>Auth complete — return to the terminal.</h2></body></html>');

      clearTimeout(timer);
      server.close();

      if (error) {
        reject(new Error(`OAuth error: ${error}`));
        return;
      }
      if (state !== expectedState) {
        reject(new Error('OAuth state mismatch'));
        return;
      }
      if (!code) {
        reject(new Error('No authorization code received'));
        return;
      }
      resolve(code);
    });

    server.listen(port, '127.0.0.1', () => {
      // Server is listening
    });

    server.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}
