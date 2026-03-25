/**
 * Substack platform adapter.
 * Uses public RSS feeds and Substack's unofficial JSON API.
 * No auth required for public newsletters.
 * Commands: feed, search (newsletter posts), latest
 */

import { Command } from 'commander';
import { request } from '../../http/client.js';
import { printOutput } from '../../output/formatter.js';

interface SubstackPost {
  rank: number;
  title: string;
  author: string;
  subtitle: string;
  post_date: string;
  url: string;
  audience: string;
  likes: number;
}

function parseRSS(xml: string, limit: number): SubstackPost[] {
  const items: SubstackPost[] = [];
  const matches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
  let rank = 1;

  for (const match of matches) {
    if (items.length >= limit) break;
    const item = match[1];

    const titleMatch = item.match(/<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>|<title[^>]*>(.*?)<\/title>/);
    const title = (titleMatch?.[1] ?? titleMatch?.[2] ?? '').trim();

    const linkMatch = item.match(/<link>(https[^<]*)<\/link>|<link[^/]*href="([^"]+)"/);
    const link = (linkMatch?.[1] ?? linkMatch?.[2] ?? '').split('?')[0];

    const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? '';
    const creator = item.match(/<dc:creator[^>]*><!\[CDATA\[(.*?)\]\]><\/dc:creator>|<dc:creator[^>]*>(.*?)<\/dc:creator>/)?.[1] ?? '';
    const subtitle = item.match(/<description[^>]*><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]
      ?.replace(/<[^>]*>/g, '').trim().slice(0, 200) ?? '';

    items.push({
      rank: rank++,
      title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
      author: creator.trim(),
      subtitle,
      post_date: pubDate ? new Date(pubDate).toISOString().slice(0, 10) : '',
      url: link,
      audience: 'everyone',
      likes: 0,
    });
  }

  return items;
}

async function fetchNewsletter(subdomain: string, limit: number): Promise<SubstackPost[]> {
  // Try JSON API first
  try {
    const data = await request<Array<Record<string, unknown>>>(
      `https://${subdomain}.substack.com/api/v1/posts?limit=${Math.min(limit, 50)}`
    );
    return data.slice(0, limit).map((post, i) => ({
      rank: i + 1,
      title: String(post['title'] ?? '').slice(0, 150),
      author: String((post['publishedBylines'] as Array<{ name: string }> | null)?.[0]?.name ?? ''),
      subtitle: String(post['subtitle'] ?? '').slice(0, 200),
      post_date: String(post['post_date'] ?? '').slice(0, 10),
      url: `https://${subdomain}.substack.com/p/${post['slug']}`,
      audience: String(post['audience'] ?? 'everyone'),
      likes: Number((post['reactions'] as Record<string, number> | null)?.['❤'] ?? 0),
    }));
  } catch {
    // Fall back to RSS
    const xml = await request<string>(`https://${subdomain}.substack.com/feed`);
    return parseRSS(xml, limit);
  }
}

const TEMPLATE = '{rank}. {title} [{audience}] likes:{likes} ({post_date}) — {subtitle} {url}';

export function registerSubstack(program: Command): void {
  const sub = program
    .command('sub')
    .description('Substack — newsletter feeds');

  sub
    .command('feed <newsletter> [limit]')
    .description('Get posts from a newsletter (e.g. "lenny", "stratechery", "thebrowser")')
    .option('--json', 'Output as JSON array')
    .action(async (newsletter: string, limitArg: string | undefined, opts: { json?: boolean }) => {
      const start = Date.now();
      const limit = limitArg ? parseInt(limitArg, 10) : 20;
      try {
        const items = await fetchNewsletter(newsletter, limit);
        printOutput(items as unknown as Record<string, unknown>[], TEMPLATE, `sub/${newsletter}`, start, { json: opts.json });
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  sub
    .command('latest <newsletter> [limit]')
    .alias('l')
    .description('Get latest posts (alias for feed)')
    .option('--json', 'Output as JSON array')
    .action(async (newsletter: string, limitArg: string | undefined, opts: { json?: boolean }) => {
      const start = Date.now();
      const limit = limitArg ? parseInt(limitArg, 10) : 10;
      try {
        const items = await fetchNewsletter(newsletter, limit);
        printOutput(items as unknown as Record<string, unknown>[], TEMPLATE, `sub/${newsletter}`, start, { json: opts.json });
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
