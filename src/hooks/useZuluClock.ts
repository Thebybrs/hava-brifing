// src/hooks/useZuluClock.ts — Canlı UTC (ZULU) kokpit saati

import { useEffect, useState } from 'react';
import { formatZulu } from '@/lib/format';

export function useZuluClock(): string {
  const [zulu, setZulu] = useState<string>(() => formatZulu(new Date()));

  useEffect(() => {
    const update = () => setZulu(formatZulu(new Date()));
    update();
    const timer = window.setInterval(update, 10_000);
    return () => window.clearInterval(timer);
  }, []);

  return zulu;
}
