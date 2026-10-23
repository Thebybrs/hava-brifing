// src/hooks/useBriefingIndex.ts — §9.5 Bellek içi Map cache ile index.json manifest hook'u

import { useCallback, useEffect, useState } from 'react';
import { fetchIndex } from '@/lib/api';
import type { BriefingManifest } from '@/types/briefing';

export type AsyncStatus = 'loading' | 'success' | 'error';

export interface UseBriefingIndexResult {
  status: AsyncStatus;
  data?: BriefingManifest;
  error?: string;
  refetch: () => void;
}

const indexCache = new Map<string, BriefingManifest>();
const CACHE_KEY = 'manifest';

export function getCachedManifest(): BriefingManifest | undefined {
  return indexCache.get(CACHE_KEY);
}

export function setCachedManifest(m: BriefingManifest): void {
  indexCache.set(CACHE_KEY, m);
}

export function useBriefingIndex(): UseBriefingIndexResult {
  const cached = indexCache.get(CACHE_KEY);
  const [status, setStatus] = useState<AsyncStatus>(
    cached ? 'success' : 'loading',
  );
  const [data, setData] = useState<BriefingManifest | undefined>(cached);
  const [error, setError] = useState<string | undefined>(undefined);
  const [reloadToken, setReloadToken] = useState(0);

  const refetch = useCallback(() => {
    indexCache.delete(CACHE_KEY);
    setReloadToken((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const hit = indexCache.get(CACHE_KEY);
    if (hit && reloadToken === 0) {
      setData(hit);
      setStatus('success');
      setError(undefined);
      return;
    }

    setStatus('loading');
    setError(undefined);

    fetchIndex()
      .then((manifest) => {
        if (cancelled) return;
        indexCache.set(CACHE_KEY, manifest);
        setData(manifest);
        setStatus('success');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg =
          err instanceof Error ? err.message : 'Brifing dizini yüklenemedi.';
        setError(msg);
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return { status, data, error, refetch };
}
