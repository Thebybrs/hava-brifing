// scripts/lib/window.ts — §4.2 TRT tarih ve 24 saatlik pencere hesabı

const TRT_TIMEZONE = 'Europe/Istanbul';

/**
 * Verilen Date nesnesini Europe/Istanbul (TRT, UTC+3) takvim gününe çevirir: "YYYY-MM-DD"
 */
export function trtDateString(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TRT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * `now` anından geriye `hours` (varsayılan 24) saatlik UTC penceresi hesaplar.
 */
export function computeWindow(
  now: Date,
  hours = 24,
): { from: Date; to: Date } {
  const to = new Date(now.getTime());
  const from = new Date(now.getTime() - hours * 3600 * 1000);
  return { from, to };
}

/**
 * "YYYY-MM-DD" tarih dizgesini Türkçe uzun tarihe çevirir (örn. "23 Ekim 2026 Cuma").
 */
export function formatTrtLong(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const utcDate = match
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

  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: TRT_TIMEZONE,
    dateStyle: 'full',
  }).format(utcDate);
}
