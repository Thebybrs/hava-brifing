// scripts/lib/dedupe.ts — §4.2 URL/başlık benzerliği (Jaccard ≥ 0.8), önceki gün filtresi ve bütçe seçimi

import type { Briefing } from '@shared/briefing.types';
import { FEEDS, type FeedGroup } from '../config/sources';
import { PIPELINE_LIMITS } from '../config/limits';
import { canonicalizeUrl, type NormalizedItem } from './normalize';

const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'in',
  'on',
  'at',
  'of',
  'to',
  'for',
  'and',
  'or',
  'with',
  'by',
  'from',
  'after',
  'over',
  'into',
  'as',
  'is',
  'are',
  'was',
  'were',
  'be',
  'new',
  've',
  'ile',
  'için',
  'bir',
  'bu',
  'da',
  'de',
]);

const feedPriorityMap = new Map<string, number>(
  FEEDS.map((f) => [f.id, f.priority]),
);

function getPriority(feedId: string): number {
  return feedPriorityMap.get(feedId) ?? 2;
}

export function tokenizeTitle(title: string): Set<string> {
  const cleaned = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
  return new Set(cleaned);
}

export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) {
      intersection += 1;
    }
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function isBetterCandidate(
  candidate: NormalizedItem,
  existing: NormalizedItem,
): boolean {
  const candPrio = getPriority(candidate.feedId);
  const existPrio = getPriority(existing.feedId);
  if (candPrio !== existPrio) {
    return candPrio < existPrio; // 1, 2'den daha yüksek önceliklidir
  }
  const candTime = candidate.publishedAt?.getTime() ?? 0;
  const existTime = existing.publishedAt?.getTime() ?? 0;
  return candTime > existTime;
}

/**
 * 1) Canonical URL eşitliği
 * 2) Normalize başlık token Jaccard ≥ 0.8 -> daha yüksek priority veya daha yeni olan kalır
 */
export function dedupeItems(items: NormalizedItem[]): NormalizedItem[] {
  const kept: NormalizedItem[] = [];
  const keptTokens: Set<string>[] = [];

  for (const item of items) {
    const itemCanonicalUrl = canonicalizeUrl(item.url) ?? item.url;
    const tokens = tokenizeTitle(item.title);

    let duplicateIdx = -1;
    for (let i = 0; i < kept.length; i += 1) {
      const existing = kept[i]!;
      const existingUrl = canonicalizeUrl(existing.url) ?? existing.url;
      if (itemCanonicalUrl === existingUrl) {
        duplicateIdx = i;
        break;
      }
      const sim = jaccardSimilarity(tokens, keptTokens[i]!);
      if (sim >= PIPELINE_LIMITS.DEDUPE_JACCARD_THRESHOLD) {
        duplicateIdx = i;
        break;
      }
    }

    if (duplicateIdx === -1) {
      kept.push(item);
      keptTokens.push(tokens);
    } else if (isBetterCandidate(item, kept[duplicateIdx]!)) {
      kept[duplicateIdx] = item;
      keptTokens[duplicateIdx] = tokens;
    }
  }

  return kept;
}

/**
 * Önceki günün brifinginde zaten yer alan URL veya çok benzer başlıklı öğeleri filtreler.
 */
export function filterAlreadyReported(
  items: NormalizedItem[],
  prev: Briefing | null,
): NormalizedItem[] {
  if (!prev) return items;

  const prevUrls = new Set<string>();
  const prevHeadlineTokens: Set<string>[] = [];

  const allPrevItems = [
    ...prev.categories.commercial_aviation,
    ...prev.categories.accidents_and_incidents,
    ...prev.categories.piloting_and_ops,
    ...prev.categories.ai_developments,
  ];

  for (const pItem of allPrevItems) {
    prevHeadlineTokens.push(tokenizeTitle(pItem.headline));
    for (const src of pItem.sources) {
      const canon = canonicalizeUrl(src.url) ?? src.url;
      prevUrls.add(canon);
    }
  }

  return items.filter((item) => {
    const canonUrl = canonicalizeUrl(item.url) ?? item.url;
    if (prevUrls.has(canonUrl)) {
      return false;
    }
    const tokens = tokenizeTitle(item.title);
    for (const prevTokens of prevHeadlineTokens) {
      if (
        jaccardSimilarity(tokens, prevTokens) >=
        PIPELINE_LIMITS.DEDUPE_JACCARD_THRESHOLD
      ) {
        return false;
      }
    }
    return true;
  });
}

function compareByPriorityAndRecency(
  a: NormalizedItem,
  b: NormalizedItem,
): number {
  const prioDiff = getPriority(a.feedId) - getPriority(b.feedId);
  if (prioDiff !== 0) return prioDiff;
  const timeA = a.publishedAt?.getTime() ?? 0;
  const timeB = b.publishedAt?.getTime() ?? 0;
  return timeB - timeA;
}

/**
 * Priority artan, ardından publishedAt azalan sıralar.
 * Grup başına minimum kota (her grupta ≥ 10 öğe, varsa) uygular.
 */
export function selectWithinBudget(
  items: NormalizedItem[],
  maxItems: number,
): NormalizedItem[] {
  if (maxItems <= 0) return [];
  const sorted = [...items].sort(compareByPriorityAndRecency);
  if (sorted.length <= maxItems) return sorted;

  const groups: FeedGroup[] = ['accidents', 'aviation', 'piloting', 'ai'];
  const minQuota = Math.min(
    PIPELINE_LIMITS.MIN_QUOTA_PER_GROUP,
    Math.floor(maxItems / groups.length),
  );

  const selected = new Set<NormalizedItem>();

  for (const grp of groups) {
    let count = 0;
    for (const item of sorted) {
      if (item.group === grp && !selected.has(item)) {
        selected.add(item);
        count += 1;
        if (count >= minQuota || selected.size >= maxItems) {
          break;
        }
      }
    }
  }

  for (const item of sorted) {
    if (selected.size >= maxItems) break;
    if (!selected.has(item)) {
      selected.add(item);
    }
  }

  return Array.from(selected).sort(compareByPriorityAndRecency);
}
