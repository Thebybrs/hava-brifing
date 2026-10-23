import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { llmBriefingZod } from '@shared/briefing.zod';
import { applyCitations } from '../gemini/citations';
import type { GroundingSource } from '../gemini/grounding';
import { buildGroundingBlock, buildRssBlock } from '../gemini/input-builder';
import type { NormalizedItem } from '../lib/normalize';
import { buildCatalog, publishBriefing } from '../lib/resolve-sources';
import { renderUserPrompt } from '../prompts/briefing.user';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const validLlmRaw = readFileSync(
  path.join(__dirname, 'fixtures/llm-output.valid.json'),
  'utf-8',
);
const invalidLlmRaw = readFileSync(
  path.join(__dirname, 'fixtures/llm-output.invalid.json'),
  'utf-8',
);

const sampleRssItems: NormalizedItem[] = [
  {
    ref: 'R001',
    feedId: 'simpleflying',
    feedName: 'Simple Flying',
    group: 'aviation',
    title: 'Airbus delivers 62 aircraft in September',
    snippet: 'Airbus announced 62 deliveries.',
    url: 'https://simpleflying.com/airbus-62-deliveries',
    publishedAt: new Date('2026-10-21T14:00:00Z'),
  },
  {
    ref: 'R002',
    feedId: 'avherald',
    feedName: 'The Aviation Herald',
    group: 'accidents',
    title: 'Incident: A320 go-around after TCAS RA',
    snippet: 'TCAS RA climb and HYD G SYS LO PR.',
    url: 'https://avherald.com/h?article=sample-xx-sim',
    publishedAt: new Date('2026-10-21T21:10:00Z'),
  },
  {
    ref: 'R003',
    feedId: 'hn_ai',
    feedName: 'Hacker News (AI)',
    group: 'ai',
    title: 'New MoE model with MCP support',
    snippet: '128k context window.',
    url: 'https://news.ycombinator.com/item?id=40000001',
    publishedAt: new Date('2026-10-22T02:20:00Z'),
  },
];

const sampleGroundingSources: GroundingSource[] = [
  {
    ref: 'G1',
    title: 'easa.europa.eu',
    url: 'https://www.easa.europa.eu/en/newsroom-and-events/news/sample-gnss-sib',
    domain: 'easa.europa.eu',
  },
];

describe('resolve-sources.ts & Faz 2 yardımcıları', () => {
  it('(a) bilinmeyen id atılır ve (b) tüm id\'leri bilinmeyen öğe düşürülüp dropped sayılır', () => {
    const llm = llmBriefingZod.parse(JSON.parse(validLlmRaw));
    const catalog = buildCatalog(sampleRssItems, sampleGroundingSources);

    const { categories, dropped } = publishBriefing(llm, catalog);

    // commercial_aviation'daki 2. öğenin kaynakları ["R888", "G99"] katalogda yok -> düşer
    expect(dropped).toBe(1);
    expect(categories.commercial_aviation.length).toBe(1);

    // commercial_aviation'daki 1. öğenin kaynakları ["R001", "R999"] -> R999 atılır, R001 kalır
    const firstComm = categories.commercial_aviation[0]!;
    expect(firstComm.sources.length).toBe(1);
    expect(firstComm.sources[0]?.url).toBe(
      'https://simpleflying.com/airbus-62-deliveries',
    );
  });

  it('(c) registration büyük harfe dönüştürülür ve negatif sayılar null yapılır', () => {
    const llm = llmBriefingZod.parse(JSON.parse(validLlmRaw));
    const catalog = buildCatalog(sampleRssItems, sampleGroundingSources);

    const { categories } = publishBriefing(llm, catalog);
    const acc = categories.accidents_and_incidents[0]!;

    expect(acc.registration).toBe('XX-SIM');
    expect(acc.sources.length).toBe(2);
    expect(acc.sources[0]?.origin).toBe('rss');
    expect(acc.sources[1]?.origin).toBe('grounding');
  });

  it('(d) üretilen öğe id\'si deterministiktir (aynı girdi -> aynı 10 haneli hex id)', () => {
    const llm = llmBriefingZod.parse(JSON.parse(validLlmRaw));
    const catalog = buildCatalog(sampleRssItems, sampleGroundingSources);

    const run1 = publishBriefing(llm, catalog);
    const run2 = publishBriefing(llm, catalog);

    const id1 = run1.categories.commercial_aviation[0]!.id;
    const id2 = run2.categories.commercial_aviation[0]!.id;

    expect(id1).toBe(id2);
    expect(id1).toMatch(/^[0-9a-f]{10}$/);
  });

  it('invalid fixture llmBriefingZod doğrulamasından geçmez', () => {
    const parsed: unknown = JSON.parse(invalidLlmRaw);
    expect(() => llmBriefingZod.parse(parsed)).toThrow();
  });

  it('applyCitations sondan başa [G#] işaretlerini indeks kaydırmadan enjekte eder ve input-builder URL içermez', () => {
    const text = 'İlk cümle olay Raporu. İkinci cümle EASA duyurusu.';
    const { text: annotated, sources } = applyCitations(text, {
      groundingChunks: [
        { web: { uri: 'https://reuters.com/a', title: 'reuters.com' } },
        { web: { uri: 'https://easa.europa.eu/b', title: 'easa.europa.eu' } },
      ],
      groundingSupports: [
        { segment: { startIndex: 0, endIndex: 22 }, groundingChunkIndices: [0] },
        {
          segment: { startIndex: 23, endIndex: text.length },
          groundingChunkIndices: [1],
        },
      ],
    });

    expect(sources.length).toBe(2);
    expect(annotated).toContain('İlk cümle olay Raporu. [G1]');
    expect(annotated).toContain('İkinci cümle EASA duyurusu. [G2]');

    const rssBlock = buildRssBlock(sampleRssItems);
    expect(rssBlock).toContain('[R001]');
    expect(rssBlock).not.toContain('https://simpleflying.com');

    const groundingBlock = buildGroundingBlock({
      notes: annotated,
      sources,
      queries: ['test query'],
      used: true,
    });
    expect(groundingBlock).toContain('[NOTLAR]');
    expect(groundingBlock).toContain('[G1] reuters.com');

    const rendered = renderUserPrompt({
      RUN_DATE_TR: '23 Ekim 2026 Cuma',
      WINDOW_FROM_UTC: '2026-10-22T05:00:00Z',
      WINDOW_TO_UTC: '2026-10-23T05:00:00Z',
      MAX_COMMERCIAL: 8,
      MAX_ACCIDENTS: 10,
      MAX_PILOTING: 8,
      MAX_AI: 8,
      PREVIOUS_HEADLINES: '- Önceki başlık',
      RSS_BLOCK: rssBlock,
      GROUNDING_BLOCK: groundingBlock,
    });
    expect(rendered).toContain('23 Ekim 2026 Cuma');
    expect(rendered).not.toContain('{{');
  });
});
