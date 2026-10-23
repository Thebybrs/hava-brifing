// scripts/lib/normalize.ts — §4.2 HTML strip, snippet kırpma, URL canonicalization, NormalizedItem

import type { FeedGroup, FeedSource } from '../config/sources';
import { PIPELINE_LIMITS } from '../config/limits';

export interface NormalizedItem {
  ref: string;                // "R001".. (ids.ts atar)
  feedId: string;
  feedName: string;
  group: FeedGroup;
  title: string;              // HTML'siz, ≤ 200 karakter
  snippet: string;            // HTML'siz, ≤ 400 karakter
  url: string;                // canonical (utm_* temizlenmiş)
  publishedAt: Date | null;
}

const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&ndash;': '–',
  '&mdash;': '—',
  '&rsquo;': '’',
  '&lsquo;': '‘',
  '&rdquo;': '”',
  '&ldquo;': '“',
  '&hellip;': '...',
};

export function stripHtmlAndCollapse(input: string): string {
  if (!input) return '';
  let text = input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');

  text = text.replace(
    /&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g,
    (full, entity: string) => {
      const lower = full.toLowerCase();
      if (HTML_ENTITIES[lower] !== undefined) {
        return HTML_ENTITIES[lower];
      }
      if (entity.startsWith('#x') || entity.startsWith('#X')) {
        const code = Number.parseInt(entity.slice(2), 16);
        return Number.isNaN(code) ? full : String.fromCodePoint(code);
      }
      if (entity.startsWith('#')) {
        const code = Number.parseInt(entity.slice(1), 10);
        return Number.isNaN(code) ? full : String.fromCodePoint(code);
      }
      return full;
    },
  );

  return text.replace(/\s+/g, ' ').trim();
}

export function truncateClean(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const sliced = text.slice(0, maxChars - 1).trimEnd();
  return `${sliced}…`;
}

export function canonicalizeUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    parsed.hash = '';
    const keysToDelete: string[] = [];
    for (const key of parsed.searchParams.keys()) {
      const lower = key.toLowerCase();
      if (
        lower.startsWith('utm_') ||
        lower === 'fbclid' ||
        lower === 'gclid' ||
        lower === 'mc_cid' ||
        lower === 'mc_eid' ||
        lower === 'ref' ||
        lower === 'ref_src'
      ) {
        keysToDelete.push(key);
      }
    }
    for (const k of keysToDelete) {
      parsed.searchParams.delete(k);
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function parseDateSafe(val: unknown): Date | null {
  if (typeof val !== 'string' || !val.trim()) return null;
  const d = new Date(val.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

function extractPointsFromText(text: string): number | null {
  const match = /\bPoints:\s*(\d+)\b/i.exec(text);
  if (!match || !match[1]) return null;
  const n = Number.parseInt(match[1], 10);
  return Number.isNaN(n) ? null : n;
}

export function normalizeItem(
  raw: unknown,
  feed: FeedSource,
): NormalizedItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;

  const rawTitle = typeof record.title === 'string' ? record.title : '';
  const rawLink =
    typeof record.link === 'string'
      ? record.link
      : typeof record.guid === 'string'
        ? record.guid
        : '';

  const cleanTitle = truncateClean(
    stripHtmlAndCollapse(rawTitle),
    PIPELINE_LIMITS.MAX_TITLE_CHARS,
  );
  const canonicalUrl = canonicalizeUrl(rawLink);

  if (!cleanTitle || !canonicalUrl) {
    return null;
  }

  const rawContentCandidate =
    (typeof record['content:encoded'] === 'string' &&
      record['content:encoded']) ||
    (typeof record.description === 'string' && record.description) ||
    (typeof record.summary === 'string' && record.summary) ||
    (typeof record.content === 'string' && record.content) ||
    (typeof record.contentSnippet === 'string' && record.contentSnippet) ||
    '';

  const fullTextForFilter = `${rawTitle} ${
    typeof record.description === 'string' ? record.description : ''
  } ${rawContentCandidate}`;

  if (feed.filter) {
    if (feed.filter.includeRegex) {
      const re = new RegExp(feed.filter.includeRegex, 'i');
      if (
        !re.test(cleanTitle) &&
        !re.test(stripHtmlAndCollapse(rawContentCandidate))
      ) {
        return null;
      }
    }
    if (typeof feed.filter.minPoints === 'number') {
      const explicitPoints =
        typeof record.points === 'number'
          ? record.points
          : extractPointsFromText(fullTextForFilter);
      if (explicitPoints !== null && explicitPoints < feed.filter.minPoints) {
        return null;
      }
    }
  }

  const cleanSnippet = truncateClean(
    stripHtmlAndCollapse(rawContentCandidate),
    PIPELINE_LIMITS.MAX_SNIPPET_CHARS,
  );

  const publishedAt =
    parseDateSafe(record.isoDate) ??
    parseDateSafe(record.pubDate) ??
    parseDateSafe(record.published) ??
    parseDateSafe(record.updated);

  return {
    ref: '',
    feedId: feed.id,
    feedName: feed.name,
    group: feed.group,
    title: cleanTitle,
    snippet: cleanSnippet,
    url: canonicalUrl,
    publishedAt,
  };
}
