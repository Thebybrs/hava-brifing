// src/pages/ArchivePage.tsx — §9.4 ve §11 Faz 6 Arşiv listesi sayfası (tarih, headline, 4 kategori sayaç mini-rozeti, ölümlü uyarısı)

import { Archive, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ImportanceBadge } from '@/components/briefing/ImportanceBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Panel } from '@/components/ui/Panel';
import { Skeleton } from '@/components/ui/Skeleton';
import { useBriefingIndex } from '@/hooks/useBriefingIndex';
import { CATEGORY_META } from '@/lib/category-meta';
import { formatDateLong } from '@/lib/format';
import { CATEGORY_KEYS } from '@/types/briefing';

export function ArchivePage() {
  const { status, data, error, refetch } = useBriefingIndex();

  if (status === 'loading') {
    return (
      <div className="space-y-3">
        <Skeleton lines={3} />
        <Skeleton lines={3} />
        <Skeleton lines={3} />
      </div>
    );
  }

  if (status === 'error' || !data) {
    return (
      <ErrorState
        message={error ?? 'Arşiv dizini yüklenemedi.'}
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Panel accent="cyan" className="p-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Archive className="w-5 h-5 text-efb-cyan shrink-0" aria-hidden="true" />
          <div>
            <h1 className="text-base sm:text-lg font-semibold text-efb-white">
              Brifing Arşivi
            </h1>
            <p className="text-xs text-efb-muted">
              Yayınlanmış günlük havacılık, pilotaj ve yapay zeka raporları
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded border border-efb-cyan/30 bg-efb-cyan/10 font-mono text-xs font-bold text-efb-cyan shrink-0">
          {data.briefings.length} GÜN
        </span>
      </Panel>

      {data.briefings.length === 0 ? (
        <EmptyState
          title="Arşiv Boş"
          description="Henüz yayınlanmış bir günlük brifing kaydı bulunmuyor."
        />
      ) : (
        <div className="space-y-2.5">
          {data.briefings.map((entry) => (
            <Link
              key={entry.date}
              to={`/d/${entry.date}`}
              className="block group"
            >
              <Panel
                accent={entry.has_fatal_accident ? 'red' : 'cyan'}
                className="p-3.5 hover:bg-efb-panel2 transition-colors space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-efb-cyan font-bold">{entry.date}</span>
                    <span className="text-efb-muted hidden sm:inline">
                      — {formatDateLong(entry.date)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {entry.has_fatal_accident && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-efb-red/15 border border-efb-red/50 text-efb-red font-mono text-[10px] font-bold uppercase tracking-wider">
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-efb-red"
                          aria-hidden="true"
                        />
                        <span>ÖLÜMLÜ</span>
                      </span>
                    )}
                    <ImportanceBadge importance={entry.max_importance} />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm sm:text-[15px] font-medium text-efb-white group-hover:text-efb-cyan transition-colors break-words">
                    {entry.headline}
                  </h2>
                  <ChevronRight
                    className="w-4 h-4 text-efb-muted group-hover:text-efb-cyan shrink-0 transition-colors"
                    aria-hidden="true"
                  />
                </div>

                {/* 4 kategori sayaç mini-rozeti */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {CATEGORY_KEYS.map((key) => {
                    const meta = CATEGORY_META[key];
                    const count = entry.counts[key] ?? 0;
                    return (
                      <span
                        key={key}
                        className={`px-2 py-0.5 rounded border font-mono text-[10px] font-semibold ${meta.badgeClass}`}
                      >
                        {meta.shortLabel.toUpperCase()}: {count}
                      </span>
                    );
                  })}
                </div>
              </Panel>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
