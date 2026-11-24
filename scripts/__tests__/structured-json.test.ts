import { describe, expect, it } from 'vitest';
import { extractJsonObject } from '../gemini/structured';

describe('extractJsonObject (scripts/gemini/structured.ts)', () => {
  it('1) Saf JSON nesnesini olduğu gibi döndürür', () => {
    const raw = '{"headline":"Test","tldr":["a","b","c"]}';
    expect(extractJsonObject(raw)).toBe(raw);
  });

  it('2) Markdown ```json kod bloğu içindeki JSON nesnesini ayıklar', () => {
    const raw = 'İşte brifing:\n```json\n{\n  "headline": "THY A350"\n}\n```\nNot: tamam.';
    expect(extractJsonObject(raw)).toBe('{\n  "headline": "THY A350"\n}');
  });

  it('3) Kod bloğu olmadan etrafında açıklama metni varsa ilk { ile son } arasını alır', () => {
    const raw = 'Yanıt aşağıdadır: {"ok": true, "nested": {"x": 1}} teşekkürler.';
    expect(extractJsonObject(raw)).toBe('{"ok": true, "nested": {"x": 1}}');
  });
});
