// scripts/lib/ids.ts — §4.2 R001.. id ataması ve deterministik itemId hash'i

import { createHash } from 'node:crypto';
import type { NormalizedItem } from './normalize';

/**
 * Öğelere sırayla R001, R002, ... referans kimliklerini atar.
 */
export function assignRefs(items: NormalizedItem[]): NormalizedItem[] {
  return items.map((item, idx) => ({
    ...item,
    ref: `R${String(idx + 1).padStart(3, '0')}`,
  }));
}

/**
 * Deterministik öğe kimliği: sha1(headline + firstUrl).slice(0, 10)
 */
export function itemId(headline: string, firstUrl: string): string {
  return createHash('sha1')
    .update(`${headline.trim()}|${firstUrl.trim()}`)
    .digest('hex')
    .slice(0, 10);
}
