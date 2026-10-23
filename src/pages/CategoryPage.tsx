// src/pages/CategoryPage.tsx — §9.4 ve §11 Faz 6 Kategori sayfası (importance azalan + confidence filtre çipleri)

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AccidentCard } from '@/components/briefing/AccidentCard';
import { NewsCard } from '@/components/briefing/NewsCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Panel } from '@/components/ui/Panel';
import { Skeleton } from '@/components/ui/Skeleton';
import { useBriefing } from '@/hooks/useBriefing';
import { CATEGORY_META, isCategoryKey } from '@/lib/category-meta';
import { formatDateLong } from '@/lib/format';
import type { Confidence } from '@/types/briefing';

type ConfidenceFilter = 'all' | Confidence;

const FILTER_CHIPS: readonly { value: ConfidenceFilter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'confirmed', label: 'Onaylı' },
  { value: 'preliminary', label: 'Ön bilgi' },
  { value: 'unverified', label: 'Doğrulanmadı' },
];

export function CategoryPage() {
  const { category } = useParams<{ category: string }>();
  const { status, data, error, refetch } = useBriefing();
  const [confidenceFilter, setConfidenceFilter] =
    useState<ConfidenceFilter>('all');

  if (!isCategoryKey(category)) {
    return (
      <ErrorState message={`Geçersiz kategori anahtarı: ${category ?? ''}`} />
    );
  }

  const meta = CATEGORY_META[category];
  const Icon = meta.icon;

  if (status === 'loading') {
    return (
      <div className="space-y-4">
        <Skeleton lines={3} />
        <Skeleton lines={4} />
        <Skeleton lines={4} />
      </div>
    );
  }

  if (status === 'error' || !data) {
    return (
      <ErrorState
        message={error ?? 'Kategori verisi yüklenemedi.'}
        onRetry={refetch}
      />
    );
  }

  const allItems = data.categories[category];
  const matchesFilter = (conf: Confidence) =>
    confidenceFilter === 'all' || conf === confidenceFilter;

  const filteredCount = allItems.filter((i) =>
    matchesFilter(i.confidence),
  ).length;

  return (
    <div className="space-y-4">
      <Panel accent={category} className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Icon className={`w-5 h-5 shrink-0 ${meta.colorClass}`} aria-hidden="true" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold text-efb-white truncate">
                {meta.label}
              </h1>
              <div className="text-xs font-mono text-efb-muted">
                {formatDateLong(data.date)}
              </div>
            </div>
          </div>
          <span
            className={`px-2.5 py-1 rounded border font-mono text-xs font-bold shrink-0 ${meta.badgeClass}`}
          >
            {filteredCount} / {allItems.length} ÖĞE
          </span>
        </div>

        {/* Confidence filtre çipleri */}
        <div
          className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-efb-line"
          role="group"
          aria-label="Doğruluk düzeyi filtresi"
        >
          <span className="font-mono text-[10px] uppercase tracking-widest text-efb-muted mr-1">
            FİLTRE:
          </span>
          {FILTER_CHIPS.map((chip) => {
            const active = confidenceFilter === chip.value;
            const count =
              chip.value === 'all'
                ? allItems.length
                : allItems.filter((i) => i.confidence === chip.value).length;

            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => setConfidenceFilter(chip.value)}
                aria-pressed={active}
                className={`px-2.5 py-1 rounded font-mono text-xs transition-colors border ${
                  active
                    ? 'bg-efb-cyan/15 text-efb-cyan border-efb-cyan font-semibold'
                    : 'bg-efb-bg text-efb-muted border-efb-line hover:text-efb-white hover:border-efb-muted'
                }`}
              >
                {chip.label} ({count})
              </button>
            );
          })}
        </div>
      </Panel>

      {filteredCount === 0 ? (
        <EmptyState
          title="Bu pencerede kayda değer gelişme yok"
          description={
            confidenceFilter === 'all'
              ? `${meta.label} kategorisinde bugün için kayıt bulunmuyor.`
              : 'Seçili doğruluk filtresine uyan haber bulunamadı.'
          }
        />
      ) : category === 'accidents_and_incidents' ? (
        <div className="space-y-3">
          {[...data.categories.accidents_and_incidents]
            .filter((item) => matchesFilter(item.confidence))
            .sort((a, b) => b.importance - a.importance)
            .map((item) => (
              <AccidentCard key={item.id} item={item} />
            ))}
        </div>
      ) : (
        <div className="space-y-3">
          {[...data.categories[category]]
            .filter((item) => matchesFilter(item.confidence))
            .sort((a, b) => b.importance - a.importance)
            .map((item) => (
              <NewsCard key={item.id} item={item} category={category} />
            ))}
        </div>
      )}
    </div>
  );
}
