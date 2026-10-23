import { mkdtemp, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Briefing } from '@shared/briefing.types';
import { briefingZod } from '@shared/briefing.zod';
import {
  createEmptyManifest,
  readManifest,
  upsertManifest,
  writeManifest,
} from '../lib/manifest';
import { readBriefing, writeBriefing } from '../lib/storage';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureRaw = readFileSync(
  path.resolve(__dirname, '../../public/data/briefings/2026-10-22.json'),
  'utf-8',
);
const baseFixture: Briefing = briefingZod.parse(JSON.parse(fixtureRaw));

function cloneBriefingWith(overrides: Partial<Briefing>): Briefing {
  return {
    ...structuredClone(baseFixture),
    ...overrides,
  };
}

describe('manifest.ts & storage.ts — Idempotent upsert, sıralama, has_fatal_accident ve atomik yazma', () => {
  it('aynı tarih tekrar eklendiğinde idempotent günceller ve tarihleri DESC sıralar', () => {
    const empty = createEmptyManifest();

    const day22 = cloneBriefingWith({
      date: '2026-10-22',
      headline: '22 Ekim ilk başlık',
    });
    const day23 = cloneBriefingWith({
      date: '2026-10-23',
      headline: '23 Ekim başlık',
    });
    const day21 = cloneBriefingWith({
      date: '2026-10-21',
      headline: '21 Ekim başlık',
    });

    let m = upsertManifest(empty, day22);
    m = upsertManifest(m, day23);
    m = upsertManifest(m, day21);

    expect(m.briefings.map((b) => b.date)).toEqual([
      '2026-10-23',
      '2026-10-22',
      '2026-10-21',
    ]);
    expect(m.latest).toBe('2026-10-23');

    // 22 Ekim aynı tarihle güncellenince sayı artmaz, başlık güncellenir
    const day22Updated = cloneBriefingWith({
      date: '2026-10-22',
      headline: '22 Ekim güncellenmiş başlık',
    });
    m = upsertManifest(m, day22Updated);

    expect(m.briefings.length).toBe(3);
    const entry22 = m.briefings.find((e) => e.date === '2026-10-22');
    expect(entry22?.headline).toBe('22 Ekim güncellenmiş başlık');
  });

  it('has_fatal_accident ve max_importance alanlarını doğru hesaplar ve keep limitini uygular', () => {
    const fatalBriefing = cloneBriefingWith({
      date: '2026-10-24',
    });
    fatalBriefing.categories.accidents_and_incidents[0] = {
      ...fatalBriefing.categories.accidents_and_incidents[0]!,
      fatalities: 3,
      importance: 5,
    };

    const m1 = upsertManifest(createEmptyManifest(), baseFixture);
    expect(m1.briefings[0]?.has_fatal_accident).toBe(false);
    expect(m1.briefings[0]?.max_importance).toBe(4);

    const m2 = upsertManifest(m1, fatalBriefing, { keep: 1 });
    expect(m2.briefings.length).toBe(1);
    expect(m2.latest).toBe('2026-10-24');
    expect(m2.briefings[0]?.has_fatal_accident).toBe(true);
    expect(m2.briefings[0]?.max_importance).toBe(5);
  });

  it('writeBriefing/readBriefing ve writeManifest/readManifest geçici klasörde atomik çalışır', async () => {
    const tmpDir = await mkdtemp(path.join(tmpdir(), 'hava-test-'));
    try {
      const missing = await readBriefing('2026-10-20', tmpDir);
      expect(missing).toBeNull();

      await writeBriefing(baseFixture, tmpDir);
      const readBack = await readBriefing('2026-10-22', tmpDir);
      expect(readBack?.headline).toBe(baseFixture.headline);

      const initialManifest = await readManifest(tmpDir);
      expect(initialManifest.briefings.length).toBe(0);

      const updatedManifest = upsertManifest(initialManifest, baseFixture);
      await writeManifest(updatedManifest, tmpDir);

      const readManifestBack = await readManifest(tmpDir);
      expect(readManifestBack.latest).toBe('2026-10-22');
      expect(readManifestBack.briefings.length).toBe(1);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});
