// src/hooks/useBriefing.ts — §9.5 Bellek içi Map cache ile günlük brifing hook'u (date yoksa index.latest)

import { useCallback, useEffect, useState } from 'react';
import { fetchBriefing, fetchIndex } from '@/lib/api';
import type { Briefing } from '@/types/briefing';
import {
  getCachedManifest,
  setCachedManifest,
  type AsyncStatus,
} from './useBriefingIndex';

export interface UseBriefingResult {
  status: AsyncStatus;
  data?: Briefing;
  error?: string;
  refetch: () => void;
}

const briefingCache = new Map<string, Briefing>();

export function useBriefing(date?: string): UseBriefingResult {
  const initialTargetDate = date ?? getCachedManifest()?.latest ?? undefined;
  const initialCached = initialTargetDate
    ? briefingCache.get(initialTargetDate)
    : undefined;

  const [status, setStatus] = useState<AsyncStatus>(
    initialCached ? 'success' : 'loading',
  );
  const [data, setData] = useState<Briefing | undefined>(initialCached);
  const [error, setError] = useState<string | undefined>(undefined);
  const [reloadToken, setReloadToken] = useState(0);

  const refetch = useCallback(() => {
    if (date) {
      briefingCache.delete(date);
    } else {
      const latest = getCachedManifest()?.latest;
      if (latest) briefingCache.delete(latest);
    }
    setReloadToken((n) => n + 1);
  }, [date]);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        let targetDate = date;
        if (!targetDate) {
          let manifest = getCachedManifest();
          if (!manifest || reloadToken > 0) {
            manifest = await fetchIndex();
            setCachedManifest(manifest);
          }
          if (!manifest.latest) {
            throw new Error('Henüz yayınlanmış bir günlük brifing bulunmuyor.');
          }
          targetDate = manifest.latest;
        }

        const cachedItem = briefingCache.get(targetDate);
        if (cachedItem && reloadToken === 0) {
          if (!cancelled) {
            setData(cachedItem);
            setStatus('success');
            setError(undefined);
          }
          return;
        }

        if (!cancelled) {
          setStatus('loading');
          setError(undefined);
        }

        const briefing = await fetchBriefing(targetDate);
        if (cancelled) return;
        briefingCache.set(targetDate, briefing);
        setData(briefing);
        setStatus('success');
      } catch (err: unknown) {
        if (cancelled) return;
        const msg =
          err instanceof Error ? err.message : 'Brifing verisi yüklenemedi.';
        setError(msg);
        setStatus('error');
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [date, reloadToken]);

  return { status, data, error, refetch };
}
