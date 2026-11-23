// scripts/lib/rss-fallback.ts — Tüm LLM sağlayıcıları başarısız olursa RSS kaynaklarından deterministik LlmBriefing üretici

import type {
  CommercialSubcategory,
  Importance,
  LlmAccidentItem,
  LlmAiItem,
  LlmBriefing,
  LlmCommercialItem,
  LlmPilotingItem,
  Regulator,
} from '@shared/briefing.types';
import { llmBriefingZod } from '@shared/briefing.zod';
import type { NormalizedItem } from './normalize';

const PRIORITY_RE =
  /\b(airbus|boeing|turkish airlines|thy|easa|faa|shgm)\b/i;

function clip(text: string, maxLen: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, Math.max(1, maxLen - 1)).trimEnd()}…`;
}

function isPriorityItem(item: NormalizedItem): boolean {
  return PRIORITY_RE.test(`${item.title} ${item.snippet}`);
}

function sortByPriorityAndRecency(items: NormalizedItem[]): NormalizedItem[] {
  return [...items].sort((a, b) => {
    const prioDiff = Number(isPriorityItem(b)) - Number(isPriorityItem(a));
    if (prioDiff !== 0) return prioDiff;
    const tA = a.publishedAt?.getTime() ?? 0;
    const tB = b.publishedAt?.getTime() ?? 0;
    return tB - tA;
  });
}

function extractPriorityEntities(
  item: NormalizedItem,
): { entities: string[]; hasPriority: boolean } {
  const text = `${item.title} ${item.snippet}`;
  const found: string[] = [];
  if (/\bairbus\b/i.test(text)) found.push('Airbus');
  if (/\bboeing\b/i.test(text)) found.push('Boeing');
  if (/\b(turkish airlines|thy)\b/i.test(text)) found.push('THY');
  if (/\beasa\b/i.test(text)) found.push('EASA');
  if (/\bfaa\b/i.test(text)) found.push('FAA');
  if (/\bshgm\b/i.test(text)) found.push('SHGM');

  const hasPriority = found.length > 0;
  if (!hasPriority) {
    const feedEntity = clip(item.feedName, 40);
    if (feedEntity.length > 0) found.push(feedEntity);
  }
  return { entities: found.slice(0, 6), hasPriority };
}

function inferCommercialSubcategory(
  item: NormalizedItem,
): CommercialSubcategory {
  const text = `${item.title} ${item.snippet}`;
  if (/\bairbus\b/i.test(text)) return 'airbus';
  if (/\bboeing\b/i.test(text)) return 'boeing';
  return 'airline_fleet';
}

function extractRegulators(item: NormalizedItem): Regulator[] {
  const text = `${item.title} ${item.snippet}`;
  const found: Regulator[] = [];
  if (/\beasa\b/i.test(text)) found.push('EASA');
  if (/\bfaa\b/i.test(text)) found.push('FAA');
  if (/\bshgm\b/i.test(text)) found.push('SHGM');
  if (/\bicao\b/i.test(text)) found.push('ICAO');
  if (/\b(uk caa|caa)\b/i.test(text)) found.push('UK_CAA');
  return found.length > 0 ? found.slice(0, 3) : ['Other'];
}

function buildTags(item: NormalizedItem, extra: string[]): string[] {
  const raw = [item.group, ...extra, 'rss_fallback']
    .map((t) => clip(t, 30))
    .filter((t) => t.length > 0);
  return [...new Set(raw)].slice(0, 5);
}

/**
 * Gemini ve diğer LLM sağlayıcıları geçici olarak erişilemez olduğunda,
 * filtrelenmiş RSS öğelerinden şemaya (%100 llmBriefingZod) tam uyan acil durum brifingi üretir.
 */
export function buildRssFallbackBriefing(
  items: NormalizedItem[],
  dateLabel: string,
): LlmBriefing {
  const validItems = items.filter((it) => /^R\d{1,3}$/.test(it.ref));

  const commercialItems: LlmCommercialItem[] = sortByPriorityAndRecency(
    validItems.filter((it) => it.group === 'aviation'),
  )
    .slice(0, 6)
    .map((item) => {
      const { entities, hasPriority } = extractPriorityEntities(item);
      const importance: Importance = hasPriority ? 4 : 3;
      return {
        headline: clip(item.title, 135),
        summary: clip(item.snippet || item.title, 580),
        why_it_matters: clip(
          `${item.feedName} kaynaklı güncel ticari havacılık gelişmesi (otomatik RSS derlemesi).`,
          280,
        ),
        importance,
        confidence: 'preliminary',
        tags: buildTags(item, entities),
        source_ids: [item.ref],
        subcategory: inferCommercialSubcategory(item),
        entities,
      };
    });

  const accidentItems: LlmAccidentItem[] = sortByPriorityAndRecency(
    validItems.filter((it) => it.group === 'accidents'),
  )
    .slice(0, 5)
    .map((item) => {
      const { entities } = extractPriorityEntities(item);
      return {
        headline: clip(item.title, 135),
        summary: clip(item.snippet || item.title, 580),
        why_it_matters: clip(
          `${item.feedName} kaynaklı emniyet/olay bildirimi (otomatik RSS derlemesi).`,
          280,
        ),
        importance: 4,
        confidence: 'preliminary',
        tags: buildTags(item, ['safety', ...entities]),
        source_ids: [item.ref],
        occurrence_class: 'incident',
        occurred_at_utc: item.publishedAt?.toISOString() ?? null,
        location: 'Bilinmiyor',
        aircraft_type: 'Bilinmiyor',
        registration: null,
        operator: null,
        flight_number: null,
        flight_phase: 'unknown',
        occupants: null,
        fatalities: null,
        injuries: null,
        technical_findings: [],
        operational_findings: [],
        investigation_status: 'ongoing',
        investigating_authority: null,
      };
    });

  const pilotingItems: LlmPilotingItem[] = sortByPriorityAndRecency(
    validItems.filter((it) => it.group === 'piloting'),
  )
    .slice(0, 5)
    .map((item) => {
      const text = `${item.title} ${item.snippet}`;
      const isAlert = /\b(ad|sib|safety|alert|directive|bulletin)\b/i.test(
        text,
      );
      const regulators = extractRegulators(item);
      return {
        headline: clip(item.title, 135),
        summary: clip(item.snippet || item.title, 580),
        why_it_matters: clip(
          `${item.feedName} kaynaklı pilotaj ve operasyon gelişmesi (otomatik RSS derlemesi).`,
          280,
        ),
        importance: isAlert ? 4 : 3,
        confidence: 'preliminary',
        tags: buildTags(item, regulators),
        source_ids: [item.ref],
        subcategory: isAlert ? 'safety_alert' : 'regulation',
        regulators,
        operational_takeaway:
          'Kaynak bülten detaylarının uçuş öncesi brifing kapsamında incelenmesi önerilir.',
      };
    });

  const aiItems: LlmAiItem[] = sortByPriorityAndRecency(
    validItems.filter((it) => it.group === 'ai'),
  )
    .slice(0, 5)
    .map((item) => {
      const feedEntity = clip(item.feedName, 40) || 'AI';
      return {
        headline: clip(item.title, 135),
        summary: clip(item.snippet || item.title, 580),
        why_it_matters: clip(
          `${item.feedName} kaynaklı güncel yapay zeka gelişmesi (otomatik RSS derlemesi).`,
          280,
        ),
        importance: 3,
        confidence: 'preliminary',
        tags: buildTags(item, ['ai']),
        source_ids: [item.ref],
        subcategory: 'product_launch',
        entities: [feedEntity],
        developer_impact:
          'Güncel yapay zeka ekosistemi ve geliştirici araçları gelişmesi (otomatik RSS derlemesi).',
      };
    });

  const prioritizedOverall = [
    ...accidentItems.slice(0, 1),
    ...commercialItems.slice(0, 2),
    ...pilotingItems.slice(0, 1),
    ...aiItems.slice(0, 1),
    ...accidentItems.slice(1),
    ...commercialItems.slice(2),
    ...pilotingItems.slice(1),
    ...aiItems.slice(1),
  ];

  const firstHeadline =
    prioritizedOverall[0]?.headline ?? validItems[0]?.title ?? '';
  const rootHeadline = clip(
    firstHeadline || `${dateLabel} — Havacılık ve AI RSS Özeti`,
    135,
  );

  const tldrSet = new Set<string>();
  for (const entry of prioritizedOverall) {
    if (tldrSet.size >= 5) break;
    tldrSet.add(clip(entry.headline, 155));
  }

  const fallbackPadding = [
    `${dateLabel} havacılık ve yapay zeka RSS başlıkları derlendi.`,
    'Gemini API yoğunluğu nedeniyle özetler otomatik RSS akışından oluşturuldu.',
    'API normale döndüğünde günlük brifing tam Türkçe analizle güncellenecektir.',
  ];
  for (const pad of fallbackPadding) {
    if (tldrSet.size >= 3) break;
    tldrSet.add(clip(pad, 155));
  }

  return llmBriefingZod.parse({
    headline: rootHeadline,
    tldr: [...tldrSet].slice(0, 5),
    categories: {
      commercial_aviation: commercialItems,
      accidents_and_incidents: accidentItems,
      piloting_and_ops: pilotingItems,
      ai_developments: aiItems,
    },
  });
}
