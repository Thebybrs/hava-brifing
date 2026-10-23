// scripts/gemini/input-builder.ts — §4.3 ve §6.4 RSS_BLOCK ve GROUNDING_BLOCK oluşturucular

import type { NormalizedItem } from '../lib/normalize';
import type { GroundingResult } from './grounding';

/**
 * RSS öğelerini URL içermeyen [R###] bloklarına dönüştürür (§6.4).
 */
export function buildRssBlock(items: NormalizedItem[]): string {
  if (items.length === 0) {
    return 'RSS haberi bulunamadı.';
  }

  return items
    .map((item) => {
      const ref = item.ref || 'R000';
      const pubIso = item.publishedAt
        ? item.publishedAt.toISOString()
        : 'bilinmiyor';
      const snippet = item.snippet || '(özet yok)';
      return [
        `[${ref}] kaynak: ${item.feedName} | grup: ${item.group} | yayın: ${pubIso}`,
        `BAŞLIK: ${item.title}`,
        `ÖZET: ${snippet}`,
        '---',
      ].join('\n');
    })
    .join('\n');
}

/**
 * Grounding sonucunu [NOTLAR] ve [KAYNAKLAR] bloğuna dönüştürür (§6.4).
 */
export function buildGroundingBlock(g: GroundingResult): string {
  if (!g.used || !g.notes.trim() || g.sources.length === 0) {
    return 'Araştırma notu yok.';
  }

  const sourcesLines = g.sources
    .map((s) => `[${s.ref}] ${s.domain}`)
    .join('\n');

  return [
    '[NOTLAR]',
    g.notes.trim(),
    '[KAYNAKLAR]',
    sourcesLines,
  ].join('\n');
}
