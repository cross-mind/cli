/**
 * Base HTTP client with exponential backoff, jitter, and typed errors.
 */

export class RateLimitError extends Error {
  constructor(public retryAfter?: number) {
    super('Rate limited');
    this.name = 'RateLimitError';
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retries?: number;
}

function jitter(base: number, factor = 0.2): number {
  const delta = base * factor;
  return base + (Math.random() * 2 - 1) * delta;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetch with exponential backoff and jitter.
 * Retries on 429, 5xx, and network errors.
 */
export async function request<T = unknown>(
  url: string,
  opts: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', headers = {}, body, timeout = 15000, retries = 3 } = opts;

  const baseHeaders = { 'Accept': 'application/json', ...headers };

  if (body !== undefined) {
    (baseHeaders as Record<string, string>)['Content-Type'] = 'application/json';
  }

  let lastError: Error = new NetworkError('Unknown error');
  let delay = 1000;

  for (let attempt = 0; attempt <= retries; attempt++) {
    // Create a fresh AbortSignal per attempt — a fired signal cannot be reused
    // and passing an already-aborted signal to fetch() causes an immediate abort.
    const init: RequestInit = {
      method,
      headers: baseHeaders,
      signal: AbortSignal.timeout(timeout),
    };
    if (body !== undefined) init.body = JSON.stringify(body);
    try {
      const res = await fetch(url, init);

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('retry-after') ?? '60', 10);
        if (attempt < retries) {
          await sleep(jitter(retryAfter * 1000));
          delay = Math.min(delay * 2, 32000);
          continue;
        }
        throw new RateLimitError(retryAfter);
      }

      if (res.status === 401 || res.status === 403) {
        let detail = '';
        try {
          const text = await res.text();
          if (text) detail = ` — ${text.slice(0, 300)}`;
        } catch { /* ignore read errors */ }
        throw new AuthError(`HTTP ${res.status} from ${url}${detail}`);
      }

      if (res.status >= 500 && attempt < retries) {
        await sleep(jitter(delay));
        delay = Math.min(delay * 2, 32000);
        lastError = new NetworkError(`HTTP ${res.status}`);
        continue;
      }

      if (!res.ok) {
        let detail = '';
        try {
          const text = await res.text();
          if (text) detail = ` — ${text.slice(0, 400)}`;
        } catch { /* ignore read errors */ }
        throw new NetworkError(`HTTP ${res.status} from ${url}${detail}`);
      }

      const ct = res.headers.get('content-type') ?? '';
      if (ct.includes('application/json') || ct.includes('application/atom+xml')) {
        // Let caller handle XML if needed
        if (ct.includes('xml')) return (await res.text()) as unknown as T;
        return (await res.json()) as T;
      }
      return (await res.text()) as unknown as T;
    } catch (err) {
      if (err instanceof AuthError || err instanceof RateLimitError) throw err;
      if (err instanceof Error) lastError = new NetworkError(err.message);
      if (attempt < retries) {
        await sleep(jitter(delay));
        delay = Math.min(delay * 2, 32000);
      }
    }
  }

  throw lastError;
}
