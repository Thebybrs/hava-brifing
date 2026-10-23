// src/components/layout/StatusStrip.tsx — §9.3 ECAM tarzı durum şeridi (kaza/olay sayısı, ölümlü uyarısı, TRT güncelleme saati)

import { formatTrt } from '@/lib/format';
import type { Briefing } from '@/types/briefing';

export interface StatusStripProps {
  briefing?: Briefing;
  status: 'loading' | 'success' | 'error';
}

export function StatusStrip({ briefing, status }: StatusStripProps) {
  if (status === 'loading' && !briefing) {
    return (
      <div className="bg-efb-bg border-b border-efb-line">
        <div className="max-w-3xl mx-auto px-3 py-1.5 font-mono text-[11px] text-efb-muted flex items-center gap-3">
          <span className="text-efb-cyan">● ECAM STANDBY</span>
          <span>VERİ YÜKLENİYOR...</span>
        </div>
      </div>
    );
  }

  if (!briefing) {
    return null;
  }

  const accidents = briefing.categories.accidents_and_incidents;
  const accidentCount = accidents.length;
  const fatalCount = accidents.filter(
    (a) => typeof a.fatalities === 'number' && a.fatalities > 0,
  ).length;
  const totalCount =
    briefing.categories.commercial_aviation.length +
    accidentCount +
    briefing.categories.piloting_and_ops.length +
    briefing.categories.ai_developments.length;

  return (
    <div className="bg-efb-bg border-b border-efb-line">
      <div className="max-w-3xl mx-auto px-3 py-1.5 font-mono text-[11px] flex flex-wrap items-center gap-x-4 gap-y-1">
        <span
          className={
            accidentCount > 0 ? 'text-efb-amber font-semibold' : 'text-efb-green'
          }
        >
          ● {accidentCount} KAZA/OLAY
        </span>

        {fatalCount > 0 && (
          <span className="text-efb-red font-bold">
            ● {fatalCount} ÖLÜMLÜ
          </span>
        )}

        <span className="text-efb-cyan">● TOPLAM {totalCount} HABER</span>

        <span className="text-efb-muted ml-auto">
          ● GÜNCEL: {formatTrt(briefing.generated_at)}
        </span>
      </div>
    </div>
  );
}
