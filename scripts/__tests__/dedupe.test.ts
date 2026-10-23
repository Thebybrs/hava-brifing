import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { briefingZod } from '@shared/briefing.zod';
import {
  dedupeItems,
  filterAlreadyReported,
  selectWithinBudget,
} from '../lib/dedupe';
import { assignRefs, itemId } from '../lib/ids';
import type { NormalizedItem } from '../lib/normalize';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureBriefingRaw = readFileSync(
  path.resolve(__dirname, '../../public/data/briefings/2026-10-22.json'),
  'utf-8',
);
const fixtureBriefing = briefingZod.parse(JSON.parse(fixtureBriefingRaw));

function makeItem(overrides: Partial<NormalizedItem>): NormalizedItem {
  return {
    ref: '',
    feedId: 'simpleflying',
    feedName: 'Simple Flying',
    group: 'aviation',
    title: 'Default aviation news headline',
    snippet: 'Snippet',
    url: 'https://simpleflying.com/default',
    publishedAt: new Date('2026-10-23T02:00:00Z'),
    ...overrides,
  };
}

describe('dedupe.ts & ids.ts — Tekilleştirme, önceki gün filtresi ve bütçe seçimi', () => {
  it('aynı canonical URL veya Jaccard ≥ 0.8 benzer başlıklarda yüksek öncelikli olanı tutar', () => {
    const lowPriorityItem = makeItem({
      feedId: 'simpleflying', // priority 2
      title: 'Airbus delivers 62 commercial aircraft in September month',
      url: 'https://simpleflying.com/airbus-62-deliveries',
      publishedAt: new Date('2026-10-23T04:00:00Z'),
    });

    const highPriorityDuplicateTitle = makeItem({
      feedId: 'avherald', // priority 1
      title: 'The Airbus delivers 62 commercial aircraft in September month',
      url: 'https://avherald.com/airbus-62-deliveries',
      publishedAt: new Date('2026-10-23T01:00:00Z'),
    });

    const sameUrlItem = makeItem({
      feedId: 'flightglobal',
      title: 'Completely different title but identical canonical URL',
      url: 'https://avherald.com/airbus-62-deliveries?utm_source=test',
    });

    const result = dedupeItems([
      lowPriorityItem,
      highPriorityDuplicateTitle,
      sameUrlItem,
    ]);

    expect(result.length).toBe(1);
    expect(result[0]?.feedId).toBe('avherald');
  });

  it('filterAlreadyReported önceki günün URL veya benzer başlığını eler', () => {
    const alreadyUrl = makeItem({
      title: 'Brand new title',
      url: 'https://simpleflying.com/airbus-september-deliveries-sample/?utm_medium=rss',
    });

    const alreadyHeadline = makeItem({
      title:
        'Airbus Eylül ayında 62 uçak teslim etti dar gövde üretim hızı artıyor',
      url: 'https://example.com/new-url',
    });

    const freshItem = makeItem({
      title: 'Boeing 777X certification flight testing resumes in Seattle',
      url: 'https://simpleflying.com/boeing-777x-resumes',
    });

    const filtered = filterAlreadyReported(
      [alreadyUrl, alreadyHeadline, freshItem],
      fixtureBriefing,
    );

    expect(filtered.length).toBe(1);
    expect(filtered[0]?.url).toBe('https://simpleflying.com/boeing-777x-resumes');
  });

  it('selectWithinBudget grup kotasını korur ve assignRefs R001..R00N atar', () => {
    const manyAiItems = Array.from({ length: 20 }, (_, i) =>
      makeItem({
        feedId: 'openai_blog', // priority 1
        group: 'ai',
        title: `AI item number ${i + 1}`,
        url: `https://openai.com/news/${i + 1}`,
      }),
    );

    const fewAviationItems = Array.from({ length: 5 }, (_, i) =>
      makeItem({
        feedId: 'simpleflying', // priority 2
        group: 'aviation',
        title: `Aviation item number ${i + 1}`,
        url: `https://simpleflying.com/news/${i + 1}`,
      }),
    );

    const selected = selectWithinBudget(
      [...manyAiItems, ...fewAviationItems],
      15,
    );
    expect(selected.length).toBe(15);

    const aviationCount = selected.filter((i) => i.group === 'aviation').length;
    expect(aviationCount).toBeGreaterThanOrEqual(3);

    const withRefs = assignRefs(selected);
    expect(withRefs[0]?.ref).toBe('R001');
    expect(withRefs[14]?.ref).toBe('R015');

    const id1 = itemId('Başlık', 'https://example.com/1');
    const id2 = itemId('Başlık', 'https://example.com/1');
    expect(id1).toBe(id2);
    expect(id1).toMatch(/^[0-9a-f]{10}$/);
  });
});
