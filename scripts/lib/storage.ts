// scripts/lib/storage.ts — §4.2 Günlük brifing JSON okuma ve atomik yazma

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Briefing } from '@shared/briefing.types';
import { briefingZod } from '@shared/briefing.zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const BRIEFINGS_DIR = path.resolve(
  __dirname,
  '../../public/data/briefings',
);

export function getBriefingFilePath(
  date: string,
  baseDir: string = BRIEFINGS_DIR,
): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Geçersiz brifing tarihi biçimi: ${date}`);
  }
  return path.join(baseDir, `${date}.json`);
}

/**
 * Belirtilen tarihe ait brifing dosyasını okur ve doğrular. Dosya yoksa `null` döner.
 */
export async function readBriefing(
  date: string,
  baseDir: string = BRIEFINGS_DIR,
): Promise<Briefing | null> {
  const filePath = getBriefingFilePath(date, baseDir);
  try {
    const raw = await readFile(filePath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    return briefingZod.parse(parsed);
  } catch (err) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: string }).code === 'ENOENT'
    ) {
      return null;
    }
    throw err;
  }
}

/**
 * Brifing nesnesini briefingZod ile doğruladıktan sonra önce `.tmp` dosyasına yazar,
 * ardından hedef yola atomik olarak rename eder. Pretty JSON (2 boşluk) + sonda `\n`.
 */
export async function writeBriefing(
  b: Briefing,
  baseDir: string = BRIEFINGS_DIR,
): Promise<string> {
  const validated = briefingZod.parse(b);
  await mkdir(baseDir, { recursive: true });

  const finalPath = getBriefingFilePath(validated.date, baseDir);
  const tmpPath = `${finalPath}.${process.pid}.${Date.now()}.tmp`;
  const payload = `${JSON.stringify(validated, null, 2)}\n`;

  await writeFile(tmpPath, payload, 'utf-8');
  await rename(tmpPath, finalPath);
  return finalPath;
}
