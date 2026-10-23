// src/components/briefing/NewsCard.tsx — §9.3 ve §11 Faz 6 Ticari Havacılık, Pilotaj/SOP ve AI haber kartı

import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { isItemRead, markItemRead } from '@/lib/storage';
import type {
  AiItem,
  CategoryKey,
  CommercialItem,
  PilotingItem,
} from '@/types/briefing';
import { ConfidenceChip } from './ConfidenceChip';
import { ImportanceBadge } from './ImportanceBadge';
import { SourceList } from './SourceList';
import { TagList } from './TagList';

export type NewsCardItem = CommercialItem | PilotingItem | AiItem;

export interface NewsCardProps {
  item: NewsCardItem;
  category: CategoryKey;
}

const SUBCATEGORY_LABELS: Record<string, string> = {
  // Commercial
  airline_fleet: 'FİLO & TESLİMAT',
  airbus: 'AIRBUS',
  boeing: 'BOEING',
  other_oem: 'OEM / ÜRETİCİ',
  airports_atc: 'HAVALİMANI & ATC',
  market_finance: 'PAZAR & FİNANS',
  route_network: 'ROTA & AĞ',
  cargo_mro: 'KARGO & MRO',
  // Piloting
  sop_procedures: 'SOP & PROSEDÜR',
  training_crm: 'EĞİTİM & CRM',
  regulation: 'REGÜLASYON',
  safety_alert: 'EMNİYET UYARISI (AD/SIB)',
  human_factors: 'İNSAN FAKTÖRLERİ',
  avionics_technology: 'AVİYONİK & SİSTEM',
  // AI
  foundation_model: 'TEMEL MODEL',
  dev_tools: 'GELİŞTİRİCİ ARAÇLARI',
  research: 'ARAŞTIRMA & MAKALE',
  open_source: 'AÇIK KAYNAK',
  infrastructure_chips: 'ALTYAPI & DONANIM',
  policy_safety: 'POLİTİKA & GÜVENLİK',
  product_launch: 'ÜRÜN LANSMANI',
};

function isPilotingItem(item: NewsCardItem): item is PilotingItem {
  return 'operational_takeaway' in item;
}

function isAiItem(item: NewsCardItem): item is AiItem {
  return 'developer_impact' in item;
}

function isCommercialItem(item: NewsCardItem): item is CommercialItem {
  return 'entities' in item && !('developer_impact' in item);
}

export function NewsCard({ item, category }: NewsCardProps) {
  const [read, setRead] = useState<boolean>(() => isItemRead(item.id));
  const [expanded, setExpanded] = useState<boolean>(false);

  const isLongSummary = item.summary.length > 220;
  const isUnverified = item.confidence === 'unverified';

  const handleMarkRead = () => {
    if (!read) {
      markItemRead(item.id);
      setRead(true);
    }
  };

  const subcatLabel =
    SUBCATEGORY_LABELS[item.subcategory] ?? item.subcategory.toUpperCase();

  return (
    <article
      onClick={handleMarkRead}
      className={`animate-fade-in transition-opacity ${
        isUnverified ? 'opacity-80' : ''
      } ${read ? 'opacity-85' : ''}`.trim()}
    >
      <Panel accent={category} className="p-4 space-y-3 hover:bg-efb-panel2/50 transition-colors">
        {/* Üst meta satırı */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-efb-bg border border-efb-line font-mono text-[10px] uppercase tracking-wider text-efb-muted">
              {subcatLabel}
            </span>

            {isPilotingItem(item) &&
              item.regulators
                .filter((reg) => reg !== 'None')
                .map((reg) => (
                  <span
                    key={reg}
                    className="px-1.5 py-0.5 rounded bg-efb-green/10 border border-efb-green/30 font-mono text-[10px] font-bold text-efb-green"
                  >
                    {reg}
                  </span>
                ))}

            <ConfidenceChip confidence={item.confidence} />
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

        {/* Özet + Devamı */}
        <div className="space-y-1">
          <p
            className={`text-[15px] leading-relaxed text-efb-text break-words ${
              isLongSummary && !expanded ? 'line-clamp-3' : ''
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
                setExpanded((prev) => !prev);
              }}
              aria-expanded={expanded}
              className="inline-flex items-center gap-1 font-mono text-xs text-efb-cyan hover:underline pt-0.5"
            >
              {expanded ? (
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
          <div className="font-mono text-[10px] uppercase tracking-widest text-efb-cyan font-semibold">
            NEDEN ÖNEMLİ
          </div>
          <p className="text-xs text-efb-text leading-relaxed break-words">
            {item.why_it_matters}
          </p>
        </div>

        {/* Kategoriye özgü alt satır */}
        {isPilotingItem(item) && (
          <div className="bg-efb-green/5 border border-efb-green/30 rounded p-2.5 space-y-1">
            <div className="font-mono text-[10px] uppercase tracking-widest text-efb-green font-semibold">
              OPS ÇIKARIMI
            </div>
            <p className="text-xs text-efb-text leading-relaxed break-words">
              {item.operational_takeaway}
            </p>
          </div>
        )}

        {isAiItem(item) && (
          <div className="space-y-2">
            <div className="bg-efb-magenta/5 border border-efb-magenta/30 rounded p-2.5 space-y-1">
              <div className="font-mono text-[10px] uppercase tracking-widest text-efb-magenta font-semibold">
                GELİŞTİRİCİ ETKİSİ
              </div>
              <p className="text-xs text-efb-text leading-relaxed break-words">
                {item.developer_impact}
              </p>
            </div>

            {item.entities.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-widest text-efb-muted">
                  MODELLER / AKTÖRLER:
                </span>
                {item.entities.map((ent) => (
                  <span
                    key={ent}
                    className="px-2 py-0.5 rounded bg-efb-magenta/10 border border-efb-magenta/30 font-mono text-[11px] text-efb-magenta font-medium"
                  >
                    {ent}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {isCommercialItem(item) && item.entities.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-efb-muted">
              AKTÖRLER:
            </span>
            {item.entities.map((entity) => (
              <span
                key={entity}
                className="px-2 py-0.5 rounded bg-efb-cyan/10 border border-efb-cyan/30 font-mono text-[11px] text-efb-cyan font-medium"
              >
                {entity}
              </span>
            ))}
          </div>
        )}

        {/* Etiketler ve Kaynaklar */}
        <TagList tags={item.tags} />
        <SourceList sources={item.sources} />
      </Panel>
    </article>
  );
}
