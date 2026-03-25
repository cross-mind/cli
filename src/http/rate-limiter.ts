/**
 * Daily write-operation limits and per-request jitter delay.
 * Counters stored in <data-dir>/daily-limits.json, reset at UTC midnight.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { getDataDir } from '../auth/store.js';

export const WRITE_LIMITS: Record<string, Record<string, number>> = {
  x:      { post: 10, reply: 30, like: 100, follow: 50, dm: 50, retweet: 50, delete: 20 },
  reddit: { comment: 20, upvote: 100, save: 50, subscribe: 20 },
  bsky:   { post: 20, reply: 50, like: 200, follow: 100, repost: 100 },
};

export const WRITE_DELAY = { min: 1500, max: 4000 };

interface DailyLimits {
  date: string; // YYYY-MM-DD UTC
  counts: Record<string, Record<string, number>>;
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

async function loadLimits(dataDir?: string): Promise<DailyLimits> {
  const dir = getDataDir(dataDir);
  const file = path.join(dir, 'daily-limits.json');
  try {
    const raw = await fs.readFile(file, 'utf8');
    const data = JSON.parse(raw) as DailyLimits;
    if (data.date !== todayUTC()) {
      return { date: todayUTC(), counts: {} };
    }
    return data;
  } catch {
    return { date: todayUTC(), counts: {} };
  }
}

async function saveLimits(limits: DailyLimits, dataDir?: string): Promise<void> {
  const dir = getDataDir(dataDir);
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, 'daily-limits.json');
  await fs.writeFile(file, JSON.stringify(limits, null, 2));
}

/**
 * Check whether a write action is within its daily limit.
 * Increments the counter on success. Throws if limit exceeded.
 */
export async function checkWriteLimit(
  platform: string,
  action: string,
  dataDir?: string
): Promise<void> {
  const limits = WRITE_LIMITS[platform];
  if (!limits || limits[action] === undefined) return; // no limit defined

  const daily = await loadLimits(dataDir);
  const platformCounts = daily.counts[platform] ?? {};
  const current = platformCounts[action] ?? 0;
  const max = limits[action];

  if (current >= max) {
    throw new Error(
      `Daily limit reached for ${platform} ${action}: ${current}/${max}. ` +
      `Resets at UTC midnight.`
    );
  }

  daily.counts[platform] = { ...platformCounts, [action]: current + 1 };
  await saveLimits(daily, dataDir);
}

/** Random jitter delay between writes. */
export async function writeDelay(): Promise<void> {
  const ms = WRITE_DELAY.min + Math.random() * (WRITE_DELAY.max - WRITE_DELAY.min);
  return new Promise((r) => setTimeout(r, ms));
}
