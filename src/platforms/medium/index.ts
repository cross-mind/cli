/**
 * Medium platform adapter.
 * Uses public RSS feeds — no auth required for reads.
 * Commands: feed (publication), profile (user), tag
 */

import { Command } from 'commander';
import { request } from '../../http/client.js';
import { printOutput } from '../../output/formatter.js';

interface MediumPost {
  rank: number;
  title: string;
  author: string;
  url: string;
  published_at: string;
  description: string;
}

function parseRSS(xml: string): MediumPost[] {
  const items: MediumPost[] = [];
  const matches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
  let rank = 1;

  for (const match of matches) {
    const item = match[1];

    const title = item.match(/<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>|<title[^>]*>(.*?)<\/title>/)?.[1]
      ?? item.match(/<title[^>]*>(.*?)<\/title>/)?.[1] ?? '';
    const link = item.match(/<link>(.*?)<\/link>|<link[^/]*\/>/)?.[1]
      ?? item.match(/<guid[^>]*>(https[^<]+)<\/guid>/)?.[1] ?? '';
    const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? '';
    const creator = item.match(/<dc:creator[^>]*><!\[CDATA\[(.*?)\]\]><\/dc:creator>|<dc:creator[^>]*>(.*?)<\/dc:creator>/)?.[1] ?? '';
    const description = item.match(/<description[^>]*><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] ?? '';

    items.push({
      rank: rank++,
      title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim(),
      author: creator.trim(),
      url: link.trim().split('?')[0] ?? link.trim(), // Remove tracking params
      published_at: pubDate ? new Date(pubDate).toISOString().slice(0, 10) : '',
      description: description.replace(/<[^>]*>/g, '').trim().slice(0, 200),
    });
  }

  return items;
}

async function fetchRSS(url: string): Promise<MediumPost[]> {
  const xml = await request<string>(url);
  return parseRSS(xml);
}

const TEMPLATE = '{rank}. {title} — by {author} ({published_at}) {url}';

export function registerMedium(program: Command): void {
  const med = program
    .command('med')
    .description('Medium — publications, user feeds, tag feeds (public RSS)');

  med
    .command('feed <publication> [limit]')
    .description('Get a publication feed (e.g. "towards-data-science", "ux-collective")')
    .option('--json', 'Output as JSON array')
    .action(async (publication: string, limitArg: string | undefined, opts: { json?: boolean }) => {
      const start = Date.now();
      const limit = limitArg ? parseInt(limitArg, 10) : 20;
      try {
        const items = await fetchRSS(`https://medium.com/feed/${publication}`);
        printOutput(
          items.slice(0, limit) as unknown as Record<string, unknown>[],
          TEMPLATE,
          `med/feed/${publication}`,
          start,
          { json: opts.json }
        );
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  med
    .command('profile <username> [limit]')
    .description("Get a user's Medium feed (username without @)")
    .option('--json', 'Output as JSON array')
    .action(async (username: string, limitArg: string | undefined, opts: { json?: boolean }) => {
      const start = Date.now();
      const limit = limitArg ? parseInt(limitArg, 10) : 20;
      try {
        const items = await fetchRSS(`https://medium.com/@${username}/feed`);
        printOutput(
          items.slice(0, limit) as unknown as Record<string, unknown>[],
          TEMPLATE,
          `med/profile/${username}`,
          start,
          { json: opts.json }
        );
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  med
    .command('tag <tag> [limit]')
    .description('Get articles by tag (e.g. "javascript", "machine-learning")')
    .option('--json', 'Output as JSON array')
    .action(async (tag: string, limitArg: string | undefined, opts: { json?: boolean }) => {
      const start = Date.now();
      const limit = limitArg ? parseInt(limitArg, 10) : 20;
      try {
        const items = await fetchRSS(`https://medium.com/feed/tag/${tag}`);
        printOutput(
          items.slice(0, limit) as unknown as Record<string, unknown>[],
          TEMPLATE,
          `med/tag/${tag}`,
          start,
          { json: opts.json }
        );
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
