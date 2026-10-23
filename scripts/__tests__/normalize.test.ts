import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { FeedSource } from '../config/sources';
import { normalizeItem } from '../lib/normalize';
import { parseFeedXml } from '../lib/rss';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sampleXml = readFileSync(
  path.join(__dirname, 'fixtures/sample-rss.xml'),
  'utf-8',
);

const mockAviationFeed: FeedSource = {
  id: 'avherald',
  name: 'The Aviation Herald',
  url: 'https://avherald.com/h?subscribe=rss',
  group: 'accidents',
  priority: 1,
  maxItems: 25,
  enabled: true,
};

const mockHnFeed: FeedSource = {
  id: 'hn_ai',
  name: 'Hacker News (AI)',
  url: 'https://hnrss.org/newest',
  group: 'ai',
  priority: 2,
  maxItems: 15,
  filter: {
    minPoints: 80,
    includeRegex:
      '\\b(AI|LLMs?|GPT(?:-?\\d[\\w.]*)?|Claude|Gemini|Llama|Mistral|transformers?|agents?|RAG|diffusion|inference|fine-?tun\\w*)\\b',
  },
  enabled: true,
};

describe('normalize.ts & rss.ts — HTML temizliği, URL canonicalization ve filtreler', () => {
  it('sample-rss.xml fixture dosyasını rss-parser ile ağa çıkmadan ayrıştırır ve HTML/UTM temizler', async () => {
    const items = await parseFeedXml(sampleXml, mockAviationFeed);
    expect(items.length).toBe(4);

    const first = items[0]!;
    expect(first.title).toBe(
      'Incident: Airbus A320-214 at Istanbul & Go-Around after TCAS RA',
    );
    expect(first.snippet).toBe(
      'An Airbus A320-214 performed a go-around at FL040 due to TCAS RA. Points: 120',
    );
    expect(first.snippet).not.toContain('<script>');
    expect(first.url).toBe('https://avherald.com/h?article=49999999');
    expect(first.publishedAt?.toISOString()).toBe('2026-10-22T18:30:00.000Z');
  });

  it('HN filtresi includeRegex ve minPoints kurallarını uygular', async () => {
    const items = await parseFeedXml(sampleXml, mockHnFeed);
    // 1. öğe: TCAS RA (AI kelimesi yok -> elenir)
    // 2. öğe: OpenAI LLM agent + Points: 145 -> GEÇER
    // 3. öğe: pasta recipe (AI kelimesi yok -> elenir)
    // 4. öğe: LLM var ama Points: 25 < 80 -> elenir
    expect(items.length).toBe(1);
    expect(items[0]?.title).toContain('OpenAI releases new reasoning LLM');
    expect(items[0]?.url).toBe('https://example.com/ai-llm-news');
  });

  it('başlık ≤ 200 ve snippet ≤ 400 karakter sınırına kırpılır', () => {
    const longTitle = 'A'.repeat(260);
    const longDesc = 'B'.repeat(520);
    const item = normalizeItem(
      {
        title: longTitle,
        link: 'https://example.com/news?utm_campaign=test',
        description: longDesc,
        isoDate: 'invalid-date',
      },
      mockAviationFeed,
    );

    expect(item).not.toBeNull();
    expect(item!.title.length).toBeLessThanOrEqual(200);
    expect(item!.snippet.length).toBeLessThanOrEqual(400);
    expect(item!.publishedAt).toBeNull();
    expect(item!.url).toBe('https://example.com/news');
  });
});
