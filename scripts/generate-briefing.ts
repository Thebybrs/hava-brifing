// scripts/generate-briefing.ts — §4.6 ORCHESTRATOR (13 adımlı uçtan uca akış)

import {
  SCHEMA_VERSION,
  type Briefing,
} from '@shared/briefing.types';
import { briefingZod } from '@shared/briefing.zod';
import { loadEnv } from './config/env';
import { PIPELINE_LIMITS } from './config/limits';
import { FEEDS, type FeedGroup } from './config/sources';
import { runGroundingStage } from './gemini/grounding';
import { buildGroundingBlock, buildRssBlock } from './gemini/input-builder';
import { runStructuredStage } from './gemini/structured';
import {
  dedupeItems,
  filterAlreadyReported,
  selectWithinBudget,
} from './lib/dedupe';
import { assignRefs } from './lib/ids';
import { logger } from './lib/logger';
import { readManifest, upsertManifest, writeManifest } from './lib/manifest';
import type { NormalizedItem } from './lib/normalize';
import { buildCatalog, publishBriefing } from './lib/resolve-sources';
import { fetchAllFeeds } from './lib/rss';
import { readBriefing, writeBriefing } from './lib/storage';
import { computeWindow, formatTrtLong, trtDateString } from './lib/window';
import { buildPayload, notifyAll } from './notify';

function previousDayString(dateStr: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) {
    throw new Error(`Geçersiz tarih dizgesi: ${dateStr}`);
  }
  const d = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0),
  );
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function extractBriefingHeadlines(b: Briefing | null): string[] {
  if (!b) return [];
  return [
    ...b.categories.commercial_aviation.map((i) => i.headline),
    ...b.categories.accidents_and_incidents.map((i) => i.headline),
    ...b.categories.piloting_and_ops.map((i) => i.headline),
    ...b.categories.ai_developments.map((i) => i.headline),
  ];
}

function groupTitlesByFeedGroup(
  items: NormalizedItem[],
): Record<FeedGroup, string[]> {
  const grouped: Record<FeedGroup, string[]> = {
    accidents: [],
    aviation: [],
    piloting: [],
    ai: [],
  };
  for (const item of items) {
    grouped[item.group].push(item.title);
  }
  return grouped;
}

async function runNotifyOnlyMode(): Promise<void> {
  await logger.group('Notify-only modu (--notify-only)', async () => {
    const siteUrl =
      process.env.SITE_URL?.trim() || 'https://thebybrs.github.io/hava-brifing/';
    const manifest = await readManifest();
    if (!manifest.latest) {
      throw new Error('index.json içinde latest brifing tarihi bulunamadı.');
    }

    const latestBriefing = await readBriefing(manifest.latest);
    if (!latestBriefing) {
      throw new Error(
        `Latest brifing dosyası okunamadı: ${manifest.latest}.json`,
      );
    }

    const payload = buildPayload(latestBriefing, siteUrl);
    const notifyRes = await notifyAll(payload);
    logger.info('Notify-only tamamlandı', {
      date: latestBriefing.date,
      ...notifyRes,
    });
  });
}

async function runFullPipeline(): Promise<void> {
  const startedAt = Date.now();

  // Adım 1: env doğrula (zod) -> hata varsa exit 1
  const env = loadEnv();

  // Adım 2: now, date (TRT), 24s pencere
  const now = new Date();
  const date = env.BRIEFING_DATE ?? trtDateString(now);
  const window = computeWindow(now, PIPELINE_LIMITS.WINDOW_HOURS);
  const dateLabel = formatTrtLong(date);
  const warnings: string[] = [];

  logger.info('Günlük brifing üretimi başlatıldı', {
    date,
    dateLabel,
    windowFrom: window.from.toISOString(),
    windowTo: window.to.toISOString(),
    model: env.GEMINI_MODEL,
    dryRun: env.DRY_RUN,
    notify: env.NOTIFY,
  });

  // Adım 3: önceki günün brifingini oku (yoksa null)
  const prevDate = previousDayString(date);
  const prevBriefing = await readBriefing(prevDate).catch((err) => {
    logger.warn(`Önceki gün brifingi (${prevDate}) okunamadı, atlanıyor.`, {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  });

  // Adım 4: aktif RSS kaynaklarını çek
  const enabledFeeds = FEEDS.filter((f) => f.enabled);
  const feedPriorityById = new Map<string, number>(
    enabledFeeds.map((f) => [f.id, f.priority]),
  );

  const rssResults = await logger.group('Adım 4: RSS Toplama', async () =>
    fetchAllFeeds(enabledFeeds, { timeoutMs: PIPELINE_LIMITS.FEED_TIMEOUT_MS }),
  );

  const rssFeedsFailed: string[] = [];
  let rssFeedsOk = 0;
  for (const res of rssResults) {
    if (res.error) {
      rssFeedsFailed.push(res.feed.id);
      warnings.push(`${res.feed.name} RSS alınamadı: ${res.error}`);
    } else {
      rssFeedsOk += 1;
    }
  }

  // Adım 5: pencere filtresi + dedupe + önceki gün filtresi + bütçe seçimi + R001.. ataması
  const allFetchedItems = rssResults.flatMap((r) => r.items);
  const rssItemsFetched = allFetchedItems.length;

  const items = await logger.group(
    'Adım 5: RSS Filtreleme & Tekilleştirme',
    async () => {
      const windowed = allFetchedItems.filter((item) => {
        if (item.publishedAt === null) {
          const prio = feedPriorityById.get(item.feedId) ?? 2;
          return prio === 1;
        }
        const t = item.publishedAt.getTime();
        return t >= window.from.getTime() && t <= window.to.getTime();
      });

      const deduped = dedupeItems(windowed);
      const notReported = filterAlreadyReported(deduped, prevBriefing);
      const budgeted = selectWithinBudget(
        notReported,
        PIPELINE_LIMITS.MAX_RSS_ITEMS,
      );
      const withRefs = assignRefs(budgeted);

      logger.info('RSS filtreleme özeti', {
        fetched: rssItemsFetched,
        windowed: windowed.length,
        deduped: deduped.length,
        afterPrevFilter: notReported.length,
        selected: withRefs.length,
      });

      return withRefs;
    },
  );

  // Adım 6: Stage A — Google Search Grounding (Ücretsiz katmanda kota harcamaması için ENABLE_GROUNDING=true ise çalışır)
  const grounding = env.ENABLE_GROUNDING
    ? await logger.group(
        'Adım 6: Stage A (Google Search Grounding)',
        async () =>
          runGroundingStage({
            dateLabel,
            window,
            coveredTitlesByGroup: groupTitlesByFeedGroup(items),
          }),
      )
    : { used: false, notes: '', sources: [], queries: [] };

  // Adım 7: Stage B — Structured Output (responseSchema)
  const rssBlock = buildRssBlock(items);
  const groundingBlock = buildGroundingBlock(grounding);
  const previousHeadlines = extractBriefingHeadlines(prevBriefing);

  const llm = await logger.group(
    'Adım 7: Stage B (Structured JSON Üretimi)',
    async () =>
      runStructuredStage({
        rssBlock,
        groundingBlock,
        previousHeadlines,
        dateLabel,
        window,
      }),
  );

  // Adım 8: Kaynak çözümleme ve yayınlama
  const { categories, dropped } = await logger.group(
    'Adım 8: Kaynak Çözümleme',
    async () => {
      const catalog = buildCatalog(items, grounding.sources);
      return publishBriefing(llm, catalog);
    },
  );

  if (dropped > 0) {
    warnings.push(
      `Geçerli kaynağı çözülemeyen ${dropped} öğe rapordan düşürüldü.`,
    );
  }

  const totalPublishedItems =
    categories.commercial_aviation.length +
    categories.accidents_and_incidents.length +
    categories.piloting_and_ops.length +
    categories.ai_developments.length;

  // §4.6 Toplam boş içerik koruması: 4 kategorinin toplamı 0 ise dosya YAZILMAZ, exit 1
  if (totalPublishedItems === 0) {
    throw new Error(
      'Toplam boş içerik koruması: 4 kategorinin tamamı boş döndü; brifing dosyası yazılmadı.',
    );
  }

  // Adım 9: Final Briefing nesnesini oluştur
  const durationMs = Date.now() - startedAt;
  const briefing: Briefing = {
    schema_version: SCHEMA_VERSION,
    date,
    generated_at: new Date().toISOString(),
    window: {
      from: window.from.toISOString(),
      to: window.to.toISOString(),
    },
    model: env.GEMINI_MODEL,
    headline: llm.headline,
    tldr: llm.tldr,
    categories,
    warnings,
    meta: {
      rss_feeds_ok: rssFeedsOk,
      rss_feeds_failed: rssFeedsFailed,
      rss_items_fetched: rssItemsFetched,
      rss_items_used: items.length,
      grounding_used: grounding.used,
      grounding_queries: grounding.queries,
      dropped_items_no_source: dropped,
      duration_ms: durationMs,
    },
  };

  // Adım 10: Son güvenlik ağı — briefingZod.parse
  const validatedBriefing = briefingZod.parse(briefing);

  // Adım 11: DRY_RUN ? stdout : writeBriefing + upsertManifest + writeManifest
  if (env.DRY_RUN) {
    logger.info('DRY_RUN=true: dosya yazma ve bildirim atlandı.');
    process.stdout.write(`${JSON.stringify(validatedBriefing, null, 2)}\n`);
    return;
  }

  await logger.group('Adım 11: Dosya ve Manifest Yazımı', async () => {
    const writtenPath = await writeBriefing(validatedBriefing);
    const currentManifest = await readManifest();
    const nextManifest = upsertManifest(currentManifest, validatedBriefing);
    await writeManifest(nextManifest);
    logger.info('Brifing ve index.json güncellendi', {
      writtenPath,
      latest: nextManifest.latest,
      totalBriefings: nextManifest.briefings.length,
    });
  });

  // Adım 12: NOTIFY !== false && !DRY_RUN ise bildirim gönder
  if (env.NOTIFY) {
    await logger.group('Adım 12: Bildirim Gönderimi', async () => {
      const payload = buildPayload(validatedBriefing, env.SITE_URL);
      const notifyRes = await notifyAll(payload);
      logger.info('Bildirim sonucu', notifyRes);
    });
  } else {
    logger.info('NOTIFY=false: bildirim adımı atlandı.');
  }
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  if (args.has('--notify-only')) {
    await runNotifyOnlyMode();
    return;
  }
  await runFullPipeline();
}

main().catch((err) => {
  const summary = err instanceof Error ? err.message : String(err);
  logger.error(`generate-briefing fatal hata: ${summary}`);
  process.stderr.write(`FATAL: ${summary}\n`);
  process.exit(1);
});
