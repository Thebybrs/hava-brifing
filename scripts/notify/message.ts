// scripts/notify/message.ts — §4.4 ve §7.1 Bildirim yükü (NotifyPayload) oluşturucu

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

/**
 * Brifing nesnesinden ntfy / Telegram ortak bildirim yükünü üretir (§4.4 ve §7.1).
 * - Ölümlü kaza varsa priority=4 ve tags=['airplane', 'warning'], aksi halde priority=3 ve tags=['airplane', 'newspaper'].
 * - Gövde ≤ 3500 karakter sınırına kırpılır.
 */
export function buildPayload(b: Briefing, siteUrl: string): NotifyPayload {
  const hasFatal = b.categories.accidents_and_incidents.some(
    (acc) => typeof acc.fatalities === 'number' && acc.fatalities > 0,
  );

  const title = `Günlük Brifing — ${formatTrtLong(b.date)}`;
  const tldrLines = b.tldr.map((line) => `• ${line}`).join('\n');
  const countsLine = `Kaza/Olay: ${b.categories.accidents_and_incidents.length} · Ticari: ${b.categories.commercial_aviation.length} · Pilotaj: ${b.categories.piloting_and_ops.length} · AI: ${b.categories.ai_developments.length}`;

  const rawBody = [b.headline, '', tldrLines, '', countsLine].join('\n');
  const body = truncateMessage(rawBody, MAX_BODY_CHARS);

  return {
    title,
    body,
    url: siteUrl.trim() || 'https://example.vercel.app/',
    priority: hasFatal ? 4 : 3,
    tags: ['airplane', hasFatal ? 'warning' : 'newspaper'],
  };
}
