// scripts/notify/message.ts — §4.4 ve §7.1 Bildirim yükü (NotifyPayload) oluşturucu + Canlı METAR kilit ekranı satırı

import type { Briefing } from '@shared/briefing.types';
import { formatTrtLong } from '../lib/window';

export interface NotifyPayload {
  title: string;
  body: string;
  url: string;
  priority: 1 | 2 | 3 | 4 | 5;
  tags: string[];
}

const MAX_BODY_CHARS = 3500;

function truncateMessage(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1).trimEnd()}…`;
}

export function formatMetarSnapshot(raw: string): string {
  const clean = raw.trim().replace(/\s+/g, ' ');
  const tokens = clean.split(' ');
  const station = tokens[0] || 'LTFM';
  let wind = '';
  let vis = '';
  let qnh = '';
  let cat = 'VFR';

  for (const t of tokens) {
    const windMatch = /^(VRB|\d{3})(\d{2,3})(?:G(\d{2,3}))?KT$/.exec(t);
    if (windMatch) {
      wind = windMatch[1] === 'VRB' ? `VRB/${windMatch[2]}kt` : `${windMatch[1]}°/${windMatch[2]}kt`;
      if (windMatch[3]) wind += ` (G${windMatch[3]})`;
    }

    if (t === 'CAVOK') {
      vis = 'CAVOK (10k+)';
      cat = 'VFR';
    } else if (t === '9999') {
      vis = '10km+';
    } else if (/^\d{4}$/.test(t)) {
      vis = `${t}m`;
      const v = Number(t);
      if (v < 5000) cat = 'IFR';
      else if (v < 8000 && cat !== 'IFR') cat = 'MVFR';
    }

    if (/^Q\d{4}$/.test(t)) {
      qnh = t;
    }

    const cloudMatch = /^(OVC|BKN)(\d{3})$/.exec(t);
    if (cloudMatch) {
      const base = Number(cloudMatch[2]) * 100;
      if (base < 1000) cat = 'IFR';
      else if (base <= 3000 && cat !== 'IFR') cat = 'MVFR';
    }
  }

  const parts = [
    `🌤️ ${station}:`,
    wind || null,
    vis ? `Görüş ${vis}` : null,
    qnh || null,
    cat ? `${cat}` : null,
  ].filter(Boolean);

  return parts.join(' • ');
}

export async function fetchLtfmSnapshot(): Promise<string> {
  const endpoints = [
    'https://metar.vatsim.net/LTFM',
    'https://aviationweather.gov/api/data/metar?ids=LTFM&format=raw',
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const text = (await res.text()).trim();
        const firstLine = text.split('\n')[0]?.trim();
        if (firstLine && firstLine.includes('LTFM')) {
          return formatMetarSnapshot(firstLine);
        }
      }
    } catch {
      // Ağ zaman aşımında sonraki uç noktayı dene
    }
  }
  return '';
}

/**
 * Brifing nesnesinden ntfy / Telegram ortak bildirim yükünü üretir (§4.4 ve §7.1).
 * - Ölümlü kaza varsa priority=4 ve tags=['airplane', 'warning'], aksi halde priority=3 ve tags=['airplane', 'newspaper'].
 * - Gövde ≤ 3500 karakter sınırına kırpılır.
 * - İsteğe bağlı olarak son satıra canlı METAR kilit ekranı satırı eklenir.
 */
export function buildPayload(
  b: Briefing,
  siteUrl: string,
  metarLine?: string,
): NotifyPayload {
  const hasFatal = b.categories.accidents_and_incidents.some(
    (acc) => typeof acc.fatalities === 'number' && acc.fatalities > 0,
  );

  const title = `Günlük Brifing — ${formatTrtLong(b.date)}`;
  const tldrLines = b.tldr.map((line) => `• ${line}`).join('\n');
  const countsLine = `Kaza/Olay: ${b.categories.accidents_and_incidents.length} · Ticari: ${b.categories.commercial_aviation.length} · Pilotaj: ${b.categories.piloting_and_ops.length} · AI: ${b.categories.ai_developments.length}`;

  const bodyParts = [b.headline, '', tldrLines, '', countsLine];
  if (metarLine?.trim()) {
    bodyParts.push('', metarLine.trim());
  }

  const rawBody = bodyParts.join('\n');
  const body = truncateMessage(rawBody, MAX_BODY_CHARS);

  return {
    title,
    body,
    url: siteUrl.trim() || 'https://thebybrs.github.io/hava-brifing/',
    priority: hasFatal ? 4 : 3,
    tags: ['airplane', hasFatal ? 'warning' : 'newspaper'],
  };
}
