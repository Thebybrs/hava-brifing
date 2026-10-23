// scripts/gemini/citations.ts — §4.3 ve §6.1 groundingMetadata -> G-id + inline [G1] enjeksiyonu

import type { GroundingMetadata } from '@google/genai';
import type { GroundingSource } from './grounding';

function extractDomain(uri: string, fallbackTitle?: string): string {
  if (fallbackTitle && fallbackTitle.trim().length > 0) {
    const cleaned = fallbackTitle.trim();
    // Genellikle groundingChunks.web.title doğrudan alan adını içerir (örn. "reuters.com")
    if (!cleaned.includes(' ') && cleaned.includes('.')) {
      return cleaned;
    }
  }
  try {
    const parsed = new URL(uri);
    return parsed.hostname.replace(/^www\./i, '');
  } catch {
    return fallbackTitle?.trim() || 'web';
  }
}

/**
 * groundingMetadata içindeki chunk'ları G1..GN kaynaklarına dönüştürür ve
 * groundingSupports segmentlerinin endIndex konumlarına sondan başa doğru [G1][G2] işaretlerini ekler.
 */
export function applyCitations(
  text: string,
  meta: GroundingMetadata,
): { text: string; sources: GroundingSource[] } {
  const rawChunks = meta.groundingChunks ?? [];
  const chunkIndexToRef = new Map<number, string>();
  const sources: GroundingSource[] = [];

  for (let i = 0; i < rawChunks.length; i += 1) {
    const web = rawChunks[i]?.web;
    const uri = web?.uri?.trim();
    if (!uri) continue;

    const ref = `G${sources.length + 1}`;
    const domain = extractDomain(uri, web?.title);
    const title = web?.title?.trim() || domain;

    chunkIndexToRef.set(i, ref);
    sources.push({
      ref,
      title,
      url: uri,
      domain,
    });
  }

  if (!text || sources.length === 0) {
    return { text, sources };
  }

  const supports = meta.groundingSupports ?? [];
  interface Insertion {
    index: number;
    marker: string;
  }

  const insertions: Insertion[] = [];

  for (const support of supports) {
    const endIndex = support.segment?.endIndex;
    const indices = support.groundingChunkIndices ?? [];
    if (typeof endIndex !== 'number' || endIndex < 0 || indices.length === 0) {
      continue;
    }

    const refs: string[] = [];
    for (const chunkIdx of indices) {
      const ref = chunkIndexToRef.get(chunkIdx);
      if (ref && !refs.includes(ref)) {
        refs.push(ref);
      }
    }

    if (refs.length > 0) {
      const clampedIndex = Math.min(text.length, Math.max(0, endIndex));
      insertions.push({
        index: clampedIndex,
        marker: ` ${refs.map((r) => `[${r}]`).join('')}`,
      });
    }
  }

  // İndeks kaymasını önlemek için sondan başa doğru sırala
  insertions.sort((a, b) => b.index - a.index);

  let annotated = text;
  for (const ins of insertions) {
    annotated =
      annotated.slice(0, ins.index) + ins.marker + annotated.slice(ins.index);
  }

  // Eğer groundingSupports boş döndüyse ancak kaynaklar varsa, LLM'in atıf yapabilmesi için metin sonuna ekle
  if (insertions.length === 0 && sources.length > 0) {
    const allRefs = sources.map((s) => `[${s.ref}]`).join('');
    annotated = `${annotated.trimEnd()} ${allRefs}`;
  }

  return { text: annotated, sources };
}
