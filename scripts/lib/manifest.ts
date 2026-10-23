// scripts/lib/manifest.ts — §4.2 index.json manifest okuma, idempotent upsert ve atomik yazma

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  SCHEMA_VERSION,
  type Briefing,
  type BriefingManifest,
  type Importance,
  type ManifestEntry,
} from '@shared/briefing.types';
import { manifestZod } from '@shared/briefing.zod';
import { BRIEFINGS_DIR } from './storage';

const DEFAULT_KEEP = 365;

export function getManifestFilePath(baseDir: string = BRIEFINGS_DIR): string {
  return path.join(baseDir, 'index.json');
}

export function createEmptyManifest(): BriefingManifest {
  return {
    schema_version: SCHEMA_VERSION,
    updated_at: new Date().toISOString(),
    latest: null,
    briefings: [],
  };
}

/**
 * `public/data/briefings/index.json` dosyasını okur; yoksa boş manifest döndürür.
 */
export async function readManifest(
  baseDir: string = BRIEFINGS_DIR,
): Promise<BriefingManifest> {
  const filePath = getManifestFilePath(baseDir);
  try {
    const raw = await readFile(filePath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    return manifestZod.parse(parsed);
  } catch (err) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: string }).code === 'ENOENT'
    ) {
      return createEmptyManifest();
    }
    throw err;
  }
}

function buildEntryFromBriefing(b: Briefing): ManifestEntry {
  const allItems = [
    ...b.categories.commercial_aviation,
    ...b.categories.accidents_and_incidents,
    ...b.categories.piloting_and_ops,
    ...b.categories.ai_developments,
  ];

  const maxImportance: Importance = allItems.reduce<Importance>(
    (max, item) => (item.importance > max ? item.importance : max),
    1,
  );

  const hasFatalAccident = b.categories.accidents_and_incidents.some(
    (acc) => typeof acc.fatalities === 'number' && acc.fatalities > 0,
  );

  return {
    date: b.date,
    path: `${b.date}.json`,
    headline: b.headline,
    counts: {
      commercial_aviation: b.categories.commercial_aviation.length,
      accidents_and_incidents: b.categories.accidents_and_incidents.length,
      piloting_and_ops: b.categories.piloting_and_ops.length,
      ai_developments: b.categories.ai_developments.length,
    },
    has_fatal_accident: hasFatalAccident,
    max_importance: maxImportance,
    generated_at: b.generated_at,
  };
}

/**
 * Manifest içine yeni brifing kaydını idempotent olarak ekler/günceller.
 * Aynı `date` varsa değiştirir, `date DESC` sıralar, `keep` (varsayılan 365) üstünü kırpar.
 */
export function upsertManifest(
  m: BriefingManifest,
  b: Briefing,
  opts?: { keep?: number },
): BriefingManifest {
  const keep = opts?.keep ?? DEFAULT_KEEP;
  const newEntry = buildEntryFromBriefing(b);

  const byDate = new Map<string, ManifestEntry>();
  for (const existing of m.briefings) {
    byDate.set(existing.date, existing);
  }
  byDate.set(newEntry.date, newEntry);

  const sorted = Array.from(byDate.values())
    .sort((a, bEntry) => bEntry.date.localeCompare(a.date))
    .slice(0, Math.max(1, keep));

  return {
    schema_version: SCHEMA_VERSION,
    updated_at: new Date().toISOString(),
    latest: sorted[0]?.date ?? null,
    briefings: sorted,
  };
}

/**
 * Manifest nesnesini doğrulayıp atomik olarak `index.json` dosyasına yazar.
 */
export async function writeManifest(
  m: BriefingManifest,
  baseDir: string = BRIEFINGS_DIR,
): Promise<void> {
  const validated = manifestZod.parse(m);
  await mkdir(baseDir, { recursive: true });

  const finalPath = getManifestFilePath(baseDir);
  const tmpPath = `${finalPath}.${process.pid}.${Date.now()}.tmp`;
  const payload = `${JSON.stringify(validated, null, 2)}\n`;

  await writeFile(tmpPath, payload, 'utf-8');
  await rename(tmpPath, finalPath);
}
