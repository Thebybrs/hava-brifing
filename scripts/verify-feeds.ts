// scripts/verify-feeds.ts — RSS URL sağlık kontrolü (bilgi amaçlı, exit code 0)

import { FEEDS, type FeedSource } from './config/sources';
import { PIPELINE_LIMITS } from './config/limits';
import { fetchTextWithTimeout, HttpStatusError } from './lib/http';
import { parseFeedXml } from './lib/rss';

interface FeedVerificationRow {
  id: string;
  enabled: boolean;
  httpStatus: string;
  itemCount: number;
  newestItemDate: string;
  healthy: string;
  error: string;
}

async function verifySingleFeed(feed: FeedSource): Promise<FeedVerificationRow> {
  try {
    const { status, text } = await fetchTextWithTimeout(feed.url, {
      timeoutMs: PIPELINE_LIMITS.FEED_TIMEOUT_MS,
    });
    const items = await parseFeedXml(text, feed);
    const newestDate = items
      .map((i) => i.publishedAt?.getTime() ?? 0)
      .reduce((max, cur) => (cur > max ? cur : max), 0);

    const newestIso = newestDate > 0 ? new Date(newestDate).toISOString() : '-';
    const isHealthy = items.length > 0;

    return {
      id: feed.id,
      enabled: feed.enabled,
      httpStatus: String(status),
      itemCount: items.length,
      newestItemDate: newestIso,
      healthy: isHealthy ? 'OK' : 'WARN (0 öğe)',
      error: '',
    };
  } catch (err) {
    const statusStr =
      err instanceof HttpStatusError ? String(err.status) : 'ERR';
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      id: feed.id,
      enabled: feed.enabled,
      httpStatus: statusStr,
      itemCount: 0,
      newestItemDate: '-',
      healthy: 'FAIL',
      error: errMsg.slice(0, 90),
    };
  }
}

async function main(): Promise<void> {
  console.log('RSS Kaynak Sağlık Kontrolü başlatılıyor...\n');
  const rows = await Promise.all(FEEDS.map((feed) => verifySingleFeed(feed)));
  console.table(rows);

  const failed = rows.filter((r) => r.healthy === 'FAIL');
  if (failed.length > 0) {
    console.log(
      `\nSağlıksız kaynaklar (${failed.length}): ${failed.map((f) => f.id).join(', ')}`,
    );
  } else {
    console.log('\nTüm RSS kaynakları sağlıklı.');
  }
}

main().catch((err) => {
  console.error('verify-feeds beklenmeyen hata:', err);
  process.exitCode = 0;
});
