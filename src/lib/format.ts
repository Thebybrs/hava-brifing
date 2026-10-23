// src/lib/format.ts — §11 Faz 5 Intl tr-TR, Zulu ve TRT saat/tarih formatlayıcıları

const TRT_TIMEZONE = 'Europe/Istanbul';

/**
 * ISO zaman dizgesini veya Date nesnesini TRT saatine çevirir (örn. "08:07 TRT").
 */
export function formatTrt(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return '—';
  const hm = new Intl.DateTimeFormat('tr-TR', {
    timeZone: TRT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
  return `${hm} TRT`;
}

/**
 * ISO zaman dizgesini veya Date nesnesini UTC/Zulu saatine çevirir (örn. "05:12Z").
 */
export function formatZulu(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return '—';
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}Z`;
}

/**
 * "YYYY-MM-DD" tarih dizgesini Türkçe uzun tarihe çevirir (örn. "24 Ekim 2026 Cumartesi").
 */
export function formatDateLong(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const d = match
    ? new Date(
        Date.UTC(
          Number(match[1]),
          Number(match[2]) - 1,
          Number(match[3]),
          12,
          0,
          0,
        ),
      )
    : new Date(date);
  if (Number.isNaN(d.getTime())) return date;

  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: TRT_TIMEZONE,
    dateStyle: 'full',
  }).format(d);
}

/**
 * ISO zaman dizgesini şu ana göre göreli Türkçe ifadeye çevirir (örn. "15 dk önce", "3 saat önce").
 */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';

  const diffSeconds = Math.round((d.getTime() - now.getTime()) / 1000);
  const absSeconds = Math.abs(diffSeconds);
  const rtf = new Intl.RelativeTimeFormat('tr-TR', { numeric: 'auto' });

  if (absSeconds < 60) {
    return rtf.format(diffSeconds, 'second');
  }
  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, 'minute');
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hour');
  }
  const diffDays = Math.round(diffHours / 24);
  return rtf.format(diffDays, 'day');
}
