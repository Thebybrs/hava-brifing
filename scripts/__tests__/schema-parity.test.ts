import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CATEGORY_KEYS } from '@shared/briefing.types';
import {
  briefingZod,
  llmAccidentItemZod,
  llmAiItemZod,
  llmBriefingZod,
  llmCommercialItemZod,
  llmPilotingItemZod,
  manifestZod,
} from '@shared/briefing.zod';
import { briefingResponseSchema } from '@shared/gemini-response-schema';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const briefingsDir = path.resolve(__dirname, '../../public/data/briefings');

describe('Şema paritesi ve fixture doğrulaması (Faz 0)', () => {
  it('1) llmBriefingZod her kategori için briefingResponseSchema propertyOrdering anahtarlarıyla birebir örtüşür', () => {
    const rootOrder = briefingResponseSchema.propertyOrdering ?? [];
    const rootZodKeys = Object.keys(llmBriefingZod.shape);
    expect([...rootZodKeys].sort()).toEqual([...rootOrder].sort());

    const categoriesSchema = briefingResponseSchema.properties?.categories;
    expect(categoriesSchema).toBeDefined();
    expect(categoriesSchema?.propertyOrdering).toEqual([...CATEGORY_KEYS]);

    const zodByCategory = {
      commercial_aviation: llmCommercialItemZod,
      accidents_and_incidents: llmAccidentItemZod,
      piloting_and_ops: llmPilotingItemZod,
      ai_developments: llmAiItemZod,
    } as const;

    for (const key of CATEGORY_KEYS) {
      const catArraySchema = categoriesSchema?.properties?.[key];
      const itemSchema = catArraySchema?.items;
      expect(itemSchema).toBeDefined();

      const geminiOrder = itemSchema?.propertyOrdering ?? [];
      const geminiPropKeys = Object.keys(itemSchema?.properties ?? {});
      const zodKeys = Object.keys(zodByCategory[key].shape);

      expect([...geminiOrder].sort()).toEqual([...geminiPropKeys].sort());
      expect([...zodKeys].sort()).toEqual([...geminiOrder].sort());
    }
  });

  it('2) 2026-10-22.json fixture dosyası briefingZod şemasından hatasız geçer ve 4 kategoride veri içerir', () => {
    const raw = readFileSync(path.join(briefingsDir, '2026-10-22.json'), 'utf-8');
    const parsedJson: unknown = JSON.parse(raw);
    const briefing = briefingZod.parse(parsedJson);

    for (const key of CATEGORY_KEYS) {
      expect(briefing.categories[key].length).toBeGreaterThanOrEqual(1);
    }

    // Spesifikasyon kontrolleri: preliminary + unverified + tüm alanları dolu accident
    const accidents = briefing.categories.accidents_and_incidents;
    expect(accidents.some((a) => a.confidence === 'preliminary')).toBe(true);
    expect(accidents.some((a) => (a.fatalities ?? 0) === 0)).toBe(true);

    const allItems = [
      ...briefing.categories.commercial_aviation,
      ...briefing.categories.accidents_and_incidents,
      ...briefing.categories.piloting_and_ops,
      ...briefing.categories.ai_developments,
    ];
    expect(allItems.some((item) => item.confidence === 'unverified')).toBe(true);
  });

  it('3) index.json manifest fixture dosyası manifestZod şemasından hatasız geçer', () => {
    const raw = readFileSync(path.join(briefingsDir, 'index.json'), 'utf-8');
    const parsedJson: unknown = JSON.parse(raw);
    const manifest = manifestZod.parse(parsedJson);

    expect(manifest.latest).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(manifest.briefings.length).toBeGreaterThanOrEqual(1);
    expect(manifest.latest).toBe(manifest.briefings[0]?.date);
  });
});
