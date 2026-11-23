import { describe, expect, it } from 'vitest';
import { llmBriefingZod } from '@shared/briefing.zod';
import type { NormalizedItem } from '../lib/normalize';
import { buildRssFallbackBriefing } from '../lib/rss-fallback';

function makeItem(
  overrides: Partial<NormalizedItem> & Pick<NormalizedItem, 'ref' | 'group' | 'title'>,
): NormalizedItem {
  return {
    feedId: 'test_feed',
    feedName: 'Test Aviation Feed',
    snippet: 'Sample concise aviation briefing snippet with operational facts.',
    url: 'https://example.com/news',
    publishedAt: new Date('2026-11-23T06:00:00Z'),
    ...overrides,
  };
}

describe('RSS Fallback Brifing Üreticisi (scripts/lib/rss-fallback.ts)', () => {
  it('1) 4 kategoride şemaya tam uyan brifing üretir ve Boeing/Airbus/THY öğelerini önceliklendirir', () => {
    const items: NormalizedItem[] = [
      makeItem({
        ref: 'R001',
        group: 'aviation',
        title: 'Regional carrier adds regional jets to winter schedule',
        publishedAt: new Date('2026-11-23T07:00:00Z'),
      }),
      makeItem({
        ref: 'R002',
        group: 'aviation',
        title: 'Turkish Airlines signs agreement for Airbus A350-900 fleet expansion',
        publishedAt: new Date('2026-11-23T05:00:00Z'),
      }),
      makeItem({
        ref: 'R003',
        group: 'accidents',
        title: 'Boeing 737-800 performs precautionary return due to hydraulic indication',
      }),
      makeItem({
        ref: 'R004',
        group: 'piloting',
        title: 'EASA issues Safety Information Bulletin on GNSS interference',
      }),
      makeItem({
        ref: 'R005',
        group: 'ai',
        title: 'Open-weights reasoning model benchmarks released for developers',
      }),
    ];

    const result = buildRssFallbackBriefing(items, '23 Kasım 2026 Pazartesi');
    const parsed = llmBriefingZod.parse(result);

    expect(parsed.categories.commercial_aviation.length).toBe(2);
    expect(parsed.categories.commercial_aviation[0]?.headline).toContain(
      'Turkish Airlines',
    );
    expect(parsed.categories.commercial_aviation[0]?.entities).toContain('Airbus');
    expect(parsed.categories.commercial_aviation[0]?.entities).toContain('THY');
    expect(parsed.categories.accidents_and_incidents.length).toBe(1);
    expect(parsed.categories.piloting_and_ops.length).toBe(1);
    expect(parsed.categories.piloting_and_ops[0]?.regulators).toContain('EASA');
    expect(parsed.categories.piloting_and_ops[0]?.subcategory).toBe('safety_alert');
    expect(parsed.categories.ai_developments.length).toBe(1);
  });

  it('2) Uzun başlık ve özetleri şema sınırları içinde kırpar ve geçerli source_ids atar', () => {
    const items: NormalizedItem[] = [
      makeItem({
        ref: 'R012',
        group: 'aviation',
        title: `Boeing ${'X'.repeat(250)}`,
        snippet: `Summary ${'Y'.repeat(800)}`,
      }),
      makeItem({
        ref: 'R013',
        group: 'accidents',
        title: `Incident ${'Z'.repeat(220)}`,
        snippet: '',
      }),
      makeItem({
        ref: 'R014',
        group: 'piloting',
        title: 'FAA updates approach stabilization training guidance',
      }),
    ];

    const result = buildRssFallbackBriefing(items, '23 Kasım 2026 Pazartesi');

    expect(result.headline.length).toBeLessThanOrEqual(140);
    expect(result.tldr.length).toBeGreaterThanOrEqual(3);
    expect(result.tldr.length).toBeLessThanOrEqual(5);
    for (const line of result.tldr) {
      expect(line.length).toBeLessThanOrEqual(160);
    }

    const comm = result.categories.commercial_aviation[0]!;
    expect(comm.headline.length).toBeLessThanOrEqual(140);
    expect(comm.summary.length).toBeLessThanOrEqual(600);
    expect(comm.source_ids).toEqual(['R012']);
  });

  it('3) Tek bir öğe sağlansa dahi tldr en az 3 madde ile şemayı karşılar', () => {
    const items: NormalizedItem[] = [
      makeItem({
        ref: 'R001',
        group: 'ai',
        title: 'AI compiler optimization reduces inference latency',
      }),
    ];

    const result = buildRssFallbackBriefing(items, '23 Kasım 2026 Pazartesi');
    expect(() => llmBriefingZod.parse(result)).not.toThrow();
    expect(result.tldr.length).toBeGreaterThanOrEqual(3);
  });
});
