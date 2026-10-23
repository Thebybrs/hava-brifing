// src/lib/api.ts — §4.5 Statik brifing JSON ve manifest istemcisi

import type { Briefing, BriefingManifest } from '@/types/briefing';

export class ApiError extends Error {
  public readonly status: number;

  constructor(status: number, message?: string) {
    super(message ?? `İstek başarısız oldu (HTTP ${status})`);
    this.name = 'ApiError';
    this.status = status;
  }
}

function getBaseUrl(): string {
  const base = import.meta.env.BASE_URL ?? '/';
  return base.endsWith('/') ? base : `${base}/`;
}

/**
 * `public/data/briefings/index.json` manifest dosyasını getirir (`cache: 'no-cache'`).
 */
export async function fetchIndex(): Promise<BriefingManifest> {
  const url = `${getBaseUrl()}data/briefings/index.json`;
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) {
    throw new ApiError(res.status, `Manifest alınamadı (HTTP ${res.status})`);
  }
  return (await res.json()) as BriefingManifest;
}

/**
 * Belirtilen tarihe (`YYYY-MM-DD`) ait brifing JSON dosyasını getirir.
 */
export async function fetchBriefing(date: string): Promise<Briefing> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ApiError(400, `Geçersiz tarih biçimi: ${date}`);
  }
  const url = `${getBaseUrl()}data/briefings/${date}.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      `${date} tarihli brifing bulunamadı (HTTP ${res.status})`,
    );
  }
  return (await res.json()) as Briefing;
}
