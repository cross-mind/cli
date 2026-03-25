/**
 * arXiv platform adapter.
 * Uses the arXiv API (Atom/XML feed) — no auth required.
 * Commands: search, recent
 */

import { Command } from 'commander';
import { request } from '../../http/client.js';
import { printOutput } from '../../output/formatter.js';

const ARXIV_API = 'https://export.arxiv.org/api/query';

interface ArxivEntry {
  rank: number;
  id: string;
  title: string;
  authors: string;
  summary: string;
  published: string;
  url: string;
  category: string;
}

function parseAtom(xml: string): ArxivEntry[] {
  const entries: ArxivEntry[] = [];
  const entryMatches = xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g);
  let rank = 1;

  for (const match of entryMatches) {
    const entry = match[1];

    const idMatch = entry.match(/<id>(.*?)<\/id>/);
    const titleMatch = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/);
    const summaryMatch = entry.match(/<summary[^>]*>([\s\S]*?)<\/summary>/);
    const publishedMatch = entry.match(/<published>(.*?)<\/published>/);
    const categoryMatch = entry.match(/<category[^>]*term="([^"]+)"/);

    const authorNames: string[] = [];
    const authorMatches = entry.matchAll(/<author>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<\/author>/g);
    for (const am of authorMatches) {
      authorNames.push(am[1].trim());
    }

    const rawId = idMatch?.[1]?.trim() ?? '';
    const arxivId = rawId.replace('http://arxiv.org/abs/', '');

    entries.push({
      rank,
      id: arxivId,
      title: (titleMatch?.[1] ?? '').replace(/\s+/g, ' ').trim(),
      authors: authorNames.slice(0, 3).join(', ') + (authorNames.length > 3 ? ' et al.' : ''),
      summary: (summaryMatch?.[1] ?? '').replace(/\s+/g, ' ').trim().slice(0, 300),
      published: (publishedMatch?.[1] ?? '').slice(0, 10),
      url: `https://arxiv.org/abs/${arxivId}`,
      category: categoryMatch?.[1] ?? '',
    });
    rank++;
  }

  return entries;
}

async function searchArxiv(query: string, limit: number, category?: string): Promise<ArxivEntry[]> {
  let searchQuery = `all:${encodeURIComponent(query)}`;
  if (category) {
    searchQuery += `+cat:${encodeURIComponent(category)}`;
  }

  const url = `${ARXIV_API}?search_query=${searchQuery}&start=0&max_results=${limit}&sortBy=relevance`;
  const xml = await request<string>(url);
  return parseAtom(xml);
}

async function recentArxiv(category: string, limit: number): Promise<ArxivEntry[]> {
  const url = `${ARXIV_API}?search_query=cat:${encodeURIComponent(category)}&start=0&max_results=${limit}&sortBy=submittedDate&sortOrder=descending`;
  const xml = await request<string>(url);
  return parseAtom(xml);
}

const TEMPLATE = '{rank}. [{category}] {title} — {authors} ({published}) {url}';

export function registerArxiv(program: Command): void {
  const arxiv = program
    .command('arxiv')
    .description('arXiv — academic preprints (CS, AI, Physics, Math, etc.)');

  arxiv
    .command('search <query> [limit]')
    .description('Search arXiv papers')
    .option('--cat <category>', 'Filter by arXiv category (e.g. cs.AI, cs.LG, stat.ML)')
    .option('--json', 'Output as JSON array')
    .action(async (query: string, limitArg: string | undefined, opts: { cat?: string; json?: boolean }) => {
      const start = Date.now();
      const limit = limitArg ? parseInt(limitArg, 10) : 10;
      try {
        const items = await searchArxiv(query, limit, opts.cat);
        printOutput(items as unknown as Record<string, unknown>[], TEMPLATE, 'arxiv/search', start, { json: opts.json });
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  arxiv
    .command('recent [limit]')
    .description('Recent papers in a category')
    .option('--cat <category>', 'arXiv category (default: cs.AI)', 'cs.AI')
    .option('--json', 'Output as JSON array')
    .action(async (limitArg: string | undefined, opts: { cat?: string; json?: boolean }) => {
      const start = Date.now();
      const limit = limitArg ? parseInt(limitArg, 10) : 10;
      try {
        const items = await recentArxiv(opts.cat ?? 'cs.AI', limit);
        printOutput(items as unknown as Record<string, unknown>[], TEMPLATE, `arxiv/recent/${opts.cat}`, start, { json: opts.json });
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
