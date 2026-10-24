// src/hooks/useMetar.ts — Canlı METAR verisi çekme, önbellekleme ve otomatik yenileme kancası

import { useCallback, useEffect, useRef, useState } from 'react';
import { parseMetar } from '@/lib/metar';
import type { MetarData } from '@/types/metar';

const CACHE_KEY_PREFIX = 'efb_metar_';
const DEFAULT_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 dakika

interface CachedPayload {
  raw: string;
  fetchedAt: number;
}

export interface UseMetarOptions {
  icao?: string;
  refreshIntervalMs?: number;
}

export interface UseMetarReturn {
  data: MetarData | null;
  raw: string | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isCached: boolean;
  refetch: () => Promise<void>;
}

export function useMetar({
  icao = 'LTFM',
  refreshIntervalMs = DEFAULT_REFRESH_INTERVAL_MS,
}: UseMetarOptions = {}): UseMetarReturn {
  const [data, setData] = useState<MetarData | null>(null);
  const [raw, setRaw] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isCached, setIsCached] = useState<boolean>(false);

  const isMountedRef = useRef<boolean>(true);

  // 1. Önbellekten okuma (Mount esnasında)
  useEffect(() => {
    isMountedRef.current = true;
    try {
      const cachedStr = localStorage.getItem(`${CACHE_KEY_PREFIX}${icao}`);
      if (cachedStr) {
        const parsed: CachedPayload = JSON.parse(cachedStr);
        if (parsed.raw) {
          const metarObj = parseMetar(parsed.raw);
          setData(metarObj);
          setRaw(parsed.raw);
          setLastUpdated(new Date(parsed.fetchedAt));
          setIsCached(true);
        }
      }
    } catch {
      // Önbellek hatası yutulur
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [icao]);

  // 2. Canlı veriyi çek
  const fetchMetarData = useCallback(async () => {
    if (!navigator.onLine) {
      setIsCached(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    const endpoints = [
      `https://metar.vatsim.net/${icao}`,
      `https://aviationweather.gov/api/data/metar?ids=${icao}&format=raw`,
    ];

    let fetchedRaw: string | null = null;
    let fetchError: Error | null = null;

    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(endpoint, {
          cache: 'no-cache',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const text = (await res.text()).trim();
          if (text && text.includes(icao)) {
            fetchedRaw = text;
            break;
          }
        }
      } catch (err) {
        fetchError = err as Error;
      }
    }

    if (!isMountedRef.current) return;

    if (fetchedRaw) {
      try {
        const parsedObj = parseMetar(fetchedRaw);
        setData(parsedObj);
        setRaw(fetchedRaw);
        const now = new Date();
        setLastUpdated(now);
        setIsCached(false);
        setError(null);

        // Önbelleğe kaydet
        try {
          const payload: CachedPayload = {
            raw: fetchedRaw,
            fetchedAt: now.getTime(),
          };
          localStorage.setItem(
            `${CACHE_KEY_PREFIX}${icao}`,
            JSON.stringify(payload),
          );
        } catch {
          // localStorage dolu veya kısıtlı olabilir
        }
      } catch (err) {
        setError('METAR verisi çözümlenemedi.');
      }
    } else {
      if (!data) {
        setError(
          fetchError?.name === 'AbortError'
            ? 'Bağlantı zaman aşımına uğradı.'
            : 'METAR verisi alınamadı.',
        );
      }
    }

    setIsLoading(false);
  }, [icao, data]);

  // 3. İlk yükleme & periyodik yenileme
  useEffect(() => {
    fetchMetarData();

    const interval = setInterval(() => {
      fetchMetarData();
    }, refreshIntervalMs);

    const handleOnline = () => {
      fetchMetarData();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
    };
  }, [fetchMetarData, refreshIntervalMs]);

  return {
    data,
    raw,
    isLoading,
    error,
    lastUpdated,
    isCached,
    refetch: fetchMetarData,
  };
}
