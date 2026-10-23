// src/components/briefing/AccidentCard.tsx — §9.3 ve §11 Faz 6 Kaza/Kırım/Ciddi Olay EFB kartı (2x3 DataField ızgarası + Açılır Bulgular)

import {
  AlertOctagon,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
} from 'lucide-react';
import { useState } from 'react';
import { DataField } from '@/components/ui/DataField';
import { Panel } from '@/components/ui/Panel';
import { formatTrt, formatZulu } from '@/lib/format';
import { isItemRead, markItemRead } from '@/lib/storage';
import type {
  AccidentItem,
  FlightPhase,
  InvestigationStatus,
  OccurrenceClass,
} from '@/types/briefing';
import { ConfidenceChip } from './ConfidenceChip';
import { ImportanceBadge } from './ImportanceBadge';
import { SourceList } from './SourceList';
import { TagList } from './TagList';

export interface AccidentCardProps {
  item: AccidentItem;
}

const OCCURRENCE_BADGE: Record<
  OccurrenceClass,
  { label: string; styleClass: string }
> = {
  accident: {
    label: 'ACCIDENT',
    styleClass: 'bg-efb-red/15 text-efb-red border border-efb-red/50',
  },
  serious_incident: {
    label: 'SERIOUS INC.',
    styleClass: 'bg-efb-amber/15 text-efb-amber border border-efb-amber/50',
  },
  incident: {
    label: 'INCIDENT',
    styleClass: 'bg-efb-cyan/15 text-efb-cyan border border-efb-cyan/40',
  },
  ground_event: {
    label: 'GROUND EVENT',
    styleClass: 'bg-efb-bg text-efb-muted border border-efb-line',
  },
  unknown: {
    label: 'UNKNOWN',
    styleClass: 'bg-efb-bg text-efb-muted border border-efb-line',
  },
};

const FLIGHT_PHASE_LABELS: Record<FlightPhase, string> = {
  standing: 'STANDING (PARK)',
  pushback_taxi: 'PUSHBACK / TAXI',
  takeoff_roll: 'TAKEOFF ROLL',
  initial_climb: 'INITIAL CLIMB',
  climb: 'CLIMB (TIRMANIŞ)',
  cruise: 'CRUISE (SEYİR)',
  descent: 'DESCENT (ALÇALIŞ)',
  approach: 'APPROACH (YAKLAŞMA)',
  landing: 'LANDING (İNİŞ)',
  go_around: 'GO-AROUND (PAS GEÇME)',
  unknown: '—',
};

const INVESTIGATION_LABELS: Record<InvestigationStatus, string> = {
  not_started: 'Başlamadı',
  ongoing: 'Soruşturma Devam Ediyor',
  preliminary_report_released: 'Ön Rapor Yayınlandı',
  final_report_released: 'Nihai Rapor Yayınlandı',
  unknown: 'Bilinmiyor',
};

function formatCasualties(item: AccidentItem): string {
  const parts: string[] = [];
  if (item.fatalities !== null && item.fatalities !== undefined) {
    parts.push(`${item.fatalities} ÖLÜ`);
  }
  if (item.injuries !== null && item.injuries !== undefined) {
    parts.push(`${item.injuries} YARALI`);
  }
  if (item.occupants !== null && item.occupants !== undefined) {
    parts.push(`${item.occupants} KİŞİ`);
  }
  return parts.length > 0 ? parts.join(' · ') : '—';
}

export function AccidentCard({ item }: AccidentCardProps) {
  const [read, setRead] = useState<boolean>(() => isItemRead(item.id));
  const [summaryExpanded, setSummaryExpanded] = useState<boolean>(false);
  const [findingsExpanded, setFindingsExpanded] = useState<boolean>(false);

  const hasFatalities = (item.fatalities ?? 0) > 0;
  const isUnverified = item.confidence === 'unverified';
  const isLongSummary = item.summary.length > 220;

  const totalFindingsCount =
    item.technical_findings.length + item.operational_findings.length;

  const occBadge = OCCURRENCE_BADGE[item.occurrence_class];
  const operatorDisplay =
    [item.operator, item.flight_number].filter(Boolean).join(' · ') || '—';

  const handleMarkRead = () => {
    if (!read) {
      markItemRead(item.id);
      setRead(true);
    }
  };

  return (
    <article
      onClick={handleMarkRead}
      className={`animate-fade-in transition-opacity ${
        isUnverified ? 'opacity-80' : ''
      } ${read ? 'opacity-85' : ''}`.trim()}
    >
      <Panel
        accent={hasFatalities ? 'red' : 'amber'}
        className={`p-4 space-y-3 hover:bg-efb-panel2/50 transition-colors ${
          hasFatalities ? 'border-efb-red/50' : ''
        }`.trim()}
      >
        {/* Üst durum çubuğu */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase tracking-wider ${occBadge.styleClass}`}
            >
              {occBadge.label}
            </span>

            {hasFatalities && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-efb-red/20 border border-efb-red text-efb-red font-mono text-[10px] font-bold uppercase tracking-wider">
                <AlertOctagon className="w-3 h-3" aria-hidden="true" />
                <span>ÖLÜMLÜ ({item.fatalities})</span>
              </span>
            )}

            <ConfidenceChip confidence={item.confidence} />

            {item.occurred_at_utc && (
              <span className="font-mono text-[10px] text-efb-muted px-1.5 py-0.5 rounded bg-efb-bg border border-efb-line">
                {formatZulu(item.occurred_at_utc)} / {formatTrt(item.occurred_at_utc)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {read && (
              <span
                className="inline-flex items-center gap-1 font-mono text-[10px] text-efb-muted"
                title="Okundu olarak işaretlendi"
              >
                <CheckCircle2 className="w-3 h-3 text-efb-cyan" aria-hidden="true" />
                <span>OKUNDU</span>
              </span>
            )}
            <ImportanceBadge importance={item.importance} />
          </div>
        </div>

        {/* Başlık */}
        <h3 className="text-[17px] font-semibold text-efb-white leading-snug break-words">
          {item.headline}
        </h3>

        {/* 2x3 EFB DataField ızgarası: TYPE · REG · PHASE · OPER · LOC · CASUALTIES */}
        <div
          className="grid grid-cols-2 sm:grid-cols-3 gap-2"
          aria-label="Kaza ve olay telemetri verileri"
        >
          <DataField
            label="TYPE"
            value={item.aircraft_type || '—'}
            tone="cyan"
          />
          <DataField
            label="REG"
            value={item.registration ?? '—'}
            tone={item.registration ? 'amber' : 'default'}
          />
          <DataField
            label="PHASE"
            value={FLIGHT_PHASE_LABELS[item.flight_phase]}
          />
          <DataField label="OPER" value={operatorDisplay} />
          <DataField label="LOC" value={item.location || '—'} />
          <DataField
            label="CASUALTIES"
            value={formatCasualties(item)}
            tone={
              hasFatalities
                ? 'red'
                : (item.injuries ?? 0) > 0
                  ? 'amber'
                  : 'default'
            }
          />
        </div>

        {/* Özet + Devamı */}
        <div className="space-y-1">
          <p
            className={`text-[15px] leading-relaxed text-efb-text break-words ${
              isLongSummary && !summaryExpanded ? 'line-clamp-3' : ''
            }`}
          >
            {item.summary}
          </p>
          {isLongSummary && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleMarkRead();
                setSummaryExpanded((prev) => !prev);
              }}
              aria-expanded={summaryExpanded}
              className="inline-flex items-center gap-1 font-mono text-xs text-efb-cyan hover:underline pt-0.5"
            >
              {summaryExpanded ? (
                <>
                  <span>Daralt</span>
                  <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                </>
              ) : (
                <>
                  <span>Devamı</span>
                  <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                </>
              )}
            </button>
          )}
        </div>

        {/* Neden Önemli */}
        <div className="bg-efb-bg/70 border border-efb-line rounded p-2.5 space-y-1">
          <div className="font-mono text-[10px] uppercase tracking-widest text-efb-amber font-semibold">
            NEDEN ÖNEMLİ
          </div>
          <p className="text-xs text-efb-text leading-relaxed break-words">
            {item.why_it_matters}
          </p>
        </div>

        {/* Açılır Bulgular Bölümü (technical_findings + operational_findings) */}
        <div className="border border-efb-line rounded bg-efb-bg/50">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleMarkRead();
              setFindingsExpanded((prev) => !prev);
            }}
            aria-expanded={findingsExpanded}
            className="w-full px-3 py-2 flex items-center justify-between gap-2 text-left font-mono text-xs text-efb-white hover:bg-efb-panel2/60 transition-colors"
          >
            <span className="inline-flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-efb-amber" aria-hidden="true" />
              <span className="uppercase tracking-wider">
                Bulgular (Teknik: {item.technical_findings.length} · Operasyonel:{' '}
                {item.operational_findings.length})
              </span>
            </span>
            {findingsExpanded ? (
              <ChevronUp className="w-4 h-4 text-efb-muted" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-4 h-4 text-efb-muted" aria-hidden="true" />
            )}
          </button>

          {findingsExpanded && (
            <div className="px-3 pb-3 pt-2 border-t border-efb-line space-y-3 text-xs">
              {totalFindingsCount === 0 ? (
                <p className="text-efb-muted font-mono">
                  Henüz teyit edilmiş teknik veya operasyonel bulgu paylaşılmadı.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-efb-cyan font-semibold">
                      TEKNİK BULGULAR
                    </div>
                    {item.technical_findings.length === 0 ? (
                      <p className="text-efb-muted font-mono">—</p>
                    ) : (
                      <ul className="space-y-1 text-efb-text">
                        {item.technical_findings.map((finding, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="font-mono text-efb-cyan">▪</span>
                            <span className="break-words">{finding}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-efb-amber font-semibold">
                      OPERASYONEL BULGULAR
                    </div>
                    {item.operational_findings.length === 0 ? (
                      <p className="text-efb-muted font-mono">—</p>
                    ) : (
                      <ul className="space-y-1 text-efb-text">
                        {item.operational_findings.map((finding, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="font-mono text-efb-amber">▪</span>
                            <span className="break-words">{finding}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Soruşturma durumu satırı */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-efb-bg/70 border border-efb-line/70 font-mono text-[11px]">
          <span className="text-efb-muted">
            SORUŞTURMA:{' '}
            <strong className="text-efb-white font-semibold">
              {INVESTIGATION_LABELS[item.investigation_status]}
            </strong>
          </span>
          <span className="text-efb-muted">
            OTORİTE:{' '}
            <strong className="text-efb-cyan font-semibold">
              {item.investigating_authority ?? '—'}
            </strong>
          </span>
        </div>

        {/* Etiketler ve Kaynaklar */}
        <TagList tags={item.tags} />
        <SourceList sources={item.sources} />
      </Panel>
    </article>
  );
}
