// scripts/lib/resolve-sources.ts — §4.2 source_ids -> SourceRef[] çözümleme ve LlmBriefing -> Briefing['categories'] dönüşümü

import type {
  AccidentItem,
  AiItem,
  Briefing,
  CommercialItem,
  LlmAccidentItem,
  LlmAiItem,
  LlmBriefing,
  LlmCommercialItem,
  LlmItemBase,
  LlmPilotingItem,
  PilotingItem,
  Published,
  SourceRef,
} from '@shared/briefing.types';
import type { GroundingSource } from '../gemini/grounding';
import { itemId } from './ids';
import type { NormalizedItem } from './normalize';

export interface SourceCatalog {
  byId: Map<string, SourceRef>; // "R014" | "G3" -> SourceRef
}

/**
 * RSS ve Grounding kaynaklarından "R001" / "G1" anahtarlı katalog oluşturur.
 */
export function buildCatalog(
  rss: NormalizedItem[],
  grounding: GroundingSource[],
): SourceCatalog {
  const byId = new Map<string, SourceRef>();

  for (const item of rss) {
    if (!item.ref) continue;
    byId.set(item.ref, {
      name: item.feedName,
      url: item.url,
      published_at: item.publishedAt ? item.publishedAt.toISOString() : null,
      origin: 'rss',
    });
  }

  for (const g of grounding) {
    if (!g.ref) continue;
    byId.set(g.ref, {
      name: g.domain || g.title,
      url: g.url,
      published_at: null,
      origin: 'grounding',
    });
  }

  return { byId };
}

function resolveSourcesForIds(
  sourceIds: string[],
  catalog: SourceCatalog,
): SourceRef[] {
  const resolved: SourceRef[] = [];
  const seenUrls = new Set<string>();

  for (const rawId of sourceIds) {
    const id = rawId.trim().toUpperCase();
    const ref = catalog.byId.get(id);
    if (!ref) continue;
    if (seenUrls.has(ref.url)) continue;
    seenUrls.add(ref.url);
    resolved.push(ref);
  }

  return resolved;
}

function publishItem<T extends LlmItemBase>(
  item: T,
  catalog: SourceCatalog,
): Published<T> | null {
  const sources = resolveSourcesForIds(item.source_ids, catalog);
  if (sources.length === 0) {
    return null;
  }

  const firstUrl = sources[0]!.url;
  const id = itemId(item.headline, firstUrl);
  const { source_ids: _omitted, ...rest } = item;

  return {
    ...rest,
    id,
    sources,
  };
}

function normalizeRegistration(reg: string | null): string | null {
  if (reg === null) return null;
  const trimmed = reg.trim().toUpperCase();
  if (
    !trimmed ||
    trimmed === 'NULL' ||
    trimmed === 'UNKNOWN' ||
    trimmed === 'BİLİNMİYOR' ||
    trimmed === 'BILINMIYOR' ||
    trimmed === 'N/A'
  ) {
    return null;
  }
  return trimmed;
}

function sanitizeNonNegativeInt(val: number | null): number | null {
  if (val === null || typeof val !== 'number' || !Number.isFinite(val)) {
    return null;
  }
  return val < 0 ? null : Math.trunc(val);
}

function normalizeAccidentItem(item: AccidentItem): AccidentItem {
  return {
    ...item,
    registration: normalizeRegistration(item.registration),
    occupants: sanitizeNonNegativeInt(item.occupants),
    fatalities: sanitizeNonNegativeInt(item.fatalities),
    injuries: sanitizeNonNegativeInt(item.injuries),
  };
}

/**
 * Kural (§4.2): Bilinmeyen id'ler atılır; hiç kaynağı kalmayan öğe DÜŞÜRÜLÜR (dropped++).
 * Ayrıca registration büyük harfe çevrilir, negatif sayılar null yapılır, id deterministik üretilir.
 */
export function publishBriefing(
  llm: LlmBriefing,
  catalog: SourceCatalog,
): { categories: Briefing['categories']; dropped: number } {
  let dropped = 0;

  const publishList = <T extends LlmItemBase>(list: T[]): Published<T>[] => {
    const out: Published<T>[] = [];
    for (const raw of list) {
      const pub = publishItem(raw, catalog);
      if (pub === null) {
        dropped += 1;
      } else {
        out.push(pub);
      }
    }
    return out.sort((a, b) => b.importance - a.importance);
  };

  const commercial_aviation: CommercialItem[] = publishList<LlmCommercialItem>(
    llm.categories.commercial_aviation,
  );
  const accidents_and_incidents: AccidentItem[] = publishList<LlmAccidentItem>(
    llm.categories.accidents_and_incidents,
  ).map(normalizeAccidentItem);
  const piloting_and_ops: PilotingItem[] = publishList<LlmPilotingItem>(
    llm.categories.piloting_and_ops,
  );
  const ai_developments: AiItem[] = publishList<LlmAiItem>(
    llm.categories.ai_developments,
  );

  return {
    categories: {
      commercial_aviation,
      accidents_and_incidents,
      piloting_and_ops,
      ai_developments,
    },
    dropped,
  };
}
