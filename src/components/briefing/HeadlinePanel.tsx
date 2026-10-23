// src/components/briefing/HeadlinePanel.tsx — §9.3 ve §11 Faz 6 Günün manşeti, TL;DR maddeleri ve üretim telemetrisi

import { Globe, Sparkles } from 'lucide-react';
import { DataField } from '@/components/ui/DataField';
import { Panel } from '@/components/ui/Panel';
import { formatDateLong, formatTrt, formatZulu } from '@/lib/format';
import type { Briefing } from '@/types/briefing';

export interface HeadlinePanelProps {
  briefing: Briefing;
  badgeLabel?: string;
}

export function HeadlinePanel({
  briefing,
  badgeLabel = 'GÜNLÜK EFB BRİFİNG ÖZETİ',
}: HeadlinePanelProps) {
  const hasFatal = briefing.categories.accidents_and_incidents.some(
    (a) => (a.fatalities ?? 0) > 0,
  );

  return (
    <section aria-label="Günün Manşeti ve Özeti">
      <Panel
        accent={hasFatal ? 'red' : 'cyan'}
        className="p-4 sm:p-5 space-y-4"
      >
        {/* Üst bilgi şeridi */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono uppercase tracking-widest">
          <span className="inline-flex items-center gap-1.5 text-efb-cyan font-semibold">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{badgeLabel}</span>
          </span>
          <span className="text-efb-muted">
            {formatDateLong(briefing.date)}
          </span>
        </div>

        {/* Ana Manşet */}
        <h1 className="text-lg sm:text-xl font-semibold text-efb-white leading-snug break-words">
          {briefing.headline}
        </h1>

        {/* TL;DR Özet Maddeleri */}
        {briefing.tldr.length > 0 && (
          <div className="border-t border-efb-line pt-3 space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-widest text-efb-muted">
              YÖNETİCİ ÖZETİ // TL;DR
            </div>
            <ul className="space-y-2 text-sm text-efb-text">
              {briefing.tldr.map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="font-mono text-[11px] font-bold text-efb-cyan bg-efb-cyan/10 border border-efb-cyan/30 rounded px-1.5 py-0.2 mt-0.5 shrink-0">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="leading-relaxed break-words">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Telemetri özeti */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <DataField label="TARİH (TRT)" value={briefing.date} tone="cyan" />
          <DataField
            label="ÜRETİM SAATİ"
            value={`${formatTrt(briefing.generated_at)} (${formatZulu(briefing.generated_at)})`}
          />
          <DataField
            label="KAYNAK HAVUZU"
            value={`${briefing.meta.rss_items_used}/${briefing.meta.rss_items_fetched} RSS`}
          />
          <DataField
            label="MODEL"
            value={briefing.model}
            tone={briefing.meta.grounding_used ? 'green' : 'default'}
          />
        </div>

        {briefing.meta.grounding_used && (
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-efb-green/10 border border-efb-green/30 font-mono text-[10px] text-efb-green">
            <Globe className="w-3 h-3" aria-hidden="true" />
            <span>
              GOOGLE WEB GROUNDING AKTİF ({briefing.meta.grounding_queries.length}{' '}
              SORGU)
            </span>
          </div>
        )}
      </Panel>
    </section>
  );
}
