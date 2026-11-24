import { describe, expect, it } from 'vitest';
import { extractJsonObject, sanitizeParsedBriefing } from '../gemini/structured';

describe('extractJsonObject & sanitizeParsedBriefing (scripts/gemini/structured.ts)', () => {
  it('1) Saf JSON nesnesini olduğu gibi döndürür', () => {
    const raw = '{"headline":"Test","tldr":["a","b","c"]}';
    expect(extractJsonObject(raw)).toBe(raw);
  });

  it('2) Markdown ```json kod bloğu içindeki JSON nesnesini ve sondaki virgülleri temizler', () => {
    const raw = 'İşte brifing:\n```json\n{\n  "headline": "THY A350",\n}\n```\nNot: tamam.';
    expect(JSON.parse(extractJsonObject(raw))).toEqual({ headline: 'THY A350' });
  });

  it('3) Kod bloğu olmadan etrafında açıklama metni varsa ilk { ile son } arasını alır', () => {
    const raw = 'Yanıt aşağıdadır: {"ok": true, "nested": {"x": 1}} teşekkürler.';
    expect(extractJsonObject(raw)).toBe('{"ok": true, "nested": {"x": 1}}');
  });

  it('4) sanitizeParsedBriefing fazla source_ids/tags dizilerini ve uzun metinleri şema sınırlarına kırpar', () => {
    const sanitized = sanitizeParsedBriefing({
      headline: 'H'.repeat(180),
      tldr: ['a', 'b', 'c', 'd', 'e', 'f'],
      categories: {
        commercial_aviation: [
          {
            headline: 'X'.repeat(160),
            summary: 'S'.repeat(700),
            why_it_matters: 'W'.repeat(350),
            source_ids: ['R001', 'R002', 'R003', 'R004', 'R005'],
            tags: ['1', '2', '3', '4', '5', '6'],
          },
        ],
      },
    }) as {
      headline: string;
      tldr: string[];
      categories: {
        commercial_aviation: Array<{
          headline: string;
          summary: string;
          why_it_matters: string;
          source_ids: string[];
          tags: string[];
        }>;
      };
    };

    expect(sanitized.headline.length).toBeLessThanOrEqual(140);
    expect(sanitized.tldr).toHaveLength(5);
    const item = sanitized.categories.commercial_aviation[0]!;
    expect(item.source_ids).toEqual(['R001', 'R002', 'R003', 'R004']);
    expect(item.tags).toHaveLength(5);
    expect(item.summary.length).toBeLessThanOrEqual(600);
  });
});
