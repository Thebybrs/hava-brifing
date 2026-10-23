// scripts/lib/rss.ts — §4.2 RSS beslemelerini çekme ve ayrıştırma

import Parser from 'rss-parser';
import type { FeedSource } from '../config/sources';
import { PIPELINE_LIMITS } from '../config/limits';
import { fetchTextWithTimeout } from './http';
import { logger } from './logger';
import { normalizeItem, type NormalizedItem } from './normalize';
import { withRetry } from './retry';

export interface FeedFetchResult {
  feed: FeedSource;
  items: NormalizedItem[];
  error?: string;
}

const rssParser = new Parser({
  customFields: {
    item: [
      ['content:encoded', 'content:encoded'],
      ['description', 'description'],
      ['summary', 'summary'],
    ],
  },
});

/**
 * XML dizgesini ayrıştırıp normalize edilmiş öğeleri döndürür (testlerde de kullanılır).
 */
export async function parseFeedXml(
  xml: string,
  feed: FeedSource,
): Promise<NormalizedItem[]> {
  const cleanedXml = xml.replace(/^\uFEFF/, '').trimStart();
  const parsed = await rssParser.parseString(cleanedXml);
  const rawItems = Array.isArray(parsed.items) ? parsed.items : [];

  const normalized: NormalizedItem[] = [];
  for (const raw of rawItems) {
    const item = normalizeItem(raw, feed);
    if (item) {
      normalized.push(item);
      if (normalized.length >= feed.maxItems) {
        break;
      }
    }
  }
  return normalized;
}

async function fetchSingleFeed(
  feed: FeedSource,
  timeoutMs: number,
): Promise<NormalizedItem[]> {
  const { text } = await withRetry(
    () => fetchTextWithTimeout(feed.url, { timeoutMs }),
    {
      retries: PIPELINE_LIMITS.FEED_RETRIES,
      baseDelayMs: PIPELINE_LIMITS.FEED_RETRY_BASE_MS,
      onRetry: (err, attempt, delayMs) => {
        logger.warn(`RSS yeniden deneniyor (${feed.id}, deneme #${attempt})`, {
          delayMs,
          error: err instanceof Error ? err.message : String(err),
        });
      },
    },
  );
  return parseFeedXml(text, feed);
}

/**
 * Tüm kaynakları paralel çeker. Tek bir kaynağın hatası pipeline'ı DURDURMAZ.
 */
export async function fetchAllFeeds(
  feeds: FeedSource[],
  opts: { timeoutMs: number },
): Promise<FeedFetchResult[]> {
  const settled = await Promise.allSettled(
    feeds.map((feed) => fetchSingleFeed(feed, opts.timeoutMs)),
  );

  return settled.map((res, idx) => {
    const feed = feeds[idx]!;
    if (res.status === 'fulfilled') {
      return { feed, items: res.value };
    }
    const errMsg =
      res.reason instanceof Error ? res.reason.message : String(res.reason);
    logger.warn(`RSS kaynağı alınamadı: ${feed.id} (${feed.name})`, {
      error: errMsg,
    });
    return { feed, items: [], error: errMsg };
  });
}
