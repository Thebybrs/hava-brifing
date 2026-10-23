import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Briefing } from '@shared/briefing.types';
import { briefingZod } from '@shared/briefing.zod';
import { buildPayload, notifyAll } from '../notify';
import {
  escapeTelegramHtml,
  formatTelegramHtmlMessage,
} from '../notify/telegram';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureRaw = readFileSync(
  path.resolve(__dirname, '../../public/data/briefings/2026-10-22.json'),
  'utf-8',
);
const baseFixture: Briefing = briefingZod.parse(JSON.parse(fixtureRaw));

describe('notify/message.ts & telegram/ntfy — Bildirim yükü, kırpma ve öncelik kuralları', () => {
  it('normal brifing için priority=3 ve newspaper etiketi üretir', () => {
    const payload = buildPayload(baseFixture, 'https://hava.example.com/');

    expect(payload.priority).toBe(3);
    expect(payload.tags).toEqual(['airplane', 'newspaper']);
    expect(payload.url).toBe('https://hava.example.com/');
    expect(payload.title).toContain('Günlük Brifing —');
    expect(payload.body).toContain(baseFixture.headline);
    expect(payload.body).toContain('• ');
    expect(payload.body).toContain(
      'Kaza/Olay: 2 · Ticari: 1 · Pilotaj: 1 · AI: 1',
    );
  });

  it('ölümlü kaza (fatalities > 0) olduğunda priority=4 ve warning etiketi üretir', () => {
    const fatalBriefing: Briefing = structuredClone(baseFixture);
    fatalBriefing.categories.accidents_and_incidents[0] = {
      ...fatalBriefing.categories.accidents_and_incidents[0]!,
      fatalities: 1,
    };

    const payload = buildPayload(fatalBriefing, 'https://hava.example.com/');
    expect(payload.priority).toBe(4);
    expect(payload.tags).toEqual(['airplane', 'warning']);
  });

  it('>3500 karakterlik çok uzun gövdeyi ≤ 3500 karaktere kırpar ve Telegram HTML kaçışlaması yapar', () => {
    const hugeBriefing: Briefing = structuredClone(baseFixture);
    hugeBriefing.headline = `Manşet <test> & "bilgi" ${'X'.repeat(500)}`;
    hugeBriefing.tldr = [
      'A'.repeat(1200),
      'B'.repeat(1200),
      'C'.repeat(1200),
      'D'.repeat(1200),
    ];

    const payload = buildPayload(hugeBriefing, 'https://hava.example.com/');
    expect(payload.body.length).toBeLessThanOrEqual(3500);
    expect(payload.body.endsWith('…')).toBe(true);

    expect(escapeTelegramHtml('<script>&</script>')).toBe(
      '&lt;script&gt;&amp;&lt;/script&gt;',
    );
    const tgHtml = formatTelegramHtmlMessage(payload);
    expect(tgHtml.length).toBeLessThanOrEqual(4096);
    expect(tgHtml).toContain('&lt;test&gt; &amp;');
  });

  it('kanal ortam değişkenleri tanımlı değilken notifyAll her iki kanal için skipped döner', async () => {
    const payload = buildPayload(baseFixture, 'https://hava.example.com/');
    const prevNtfy = process.env.NTFY_TOPIC;
    const prevTgToken = process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.NTFY_TOPIC;
    delete process.env.TELEGRAM_BOT_TOKEN;

    try {
      const res = await notifyAll(payload);
      expect(res).toEqual({ ntfy: 'skipped', telegram: 'skipped' });
    } finally {
      if (prevNtfy !== undefined) process.env.NTFY_TOPIC = prevNtfy;
      if (prevTgToken !== undefined) process.env.TELEGRAM_BOT_TOKEN = prevTgToken;
    }
  });
});
