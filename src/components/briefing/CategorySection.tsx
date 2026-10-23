// src/components/briefing/CategorySection.tsx — §9.4 ve §11 Faz 6 Kategori bölümü (ilk N öğe + "Tümünü gör (N)" + EmptyState)

import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui/EmptyState';
import { CATEGORY_META } from '@/lib/category-meta';
import type { Briefing, CategoryKey } from '@/types/briefing';
import { AccidentCard } from './AccidentCard';
import { NewsCard } from './NewsCard';

export interface CategorySectionProps {
  category: CategoryKey;
  categories: Briefing['categories'];
  /** Gösterilecek maksimum kart sayısı (tanımsızsa tümü) */
  limit?: number;
  /** "Tümünü gör (N)" bağlantısını göster */
  showViewAll?: boolean;
}

export function CategorySection({
  category,
  categories,
  limit,
  showViewAll = true,
}: CategorySectionProps) {
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;
  const rawItems = categories[category];
  const totalCount = rawItems.length;

  return (
    <section
      id={`section-${category}`}
      aria-labelledby={`heading-${category}`}
      className="space-y-3"
    >
      {/* Bölüm Başlığı */}
      <div className="flex items-center justify-between gap-2 border-b border-efb-line pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={`w-4 h-4 shrink-0 ${meta.colorClass}`} aria-hidden="true" />
          <h2
            id={`heading-${category}`}
            className="text-sm sm:text-base font-mono font-bold uppercase tracking-wider text-efb-white truncate"
          >
            {meta.label}
          </h2>
          <span
            className={`px-2 py-0.5 rounded border font-mono text-xs font-bold ${meta.badgeClass}`}
          >
            {totalCount}
          </span>
        </div>

        {showViewAll && totalCount > 0 && (
          <Link
            to={meta.route}
            className="inline-flex items-center gap-1 font-mono text-xs text-efb-cyan hover:underline shrink-0"
          >
            <span>Tümünü gör ({totalCount})</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>

      {/* İçerik */}
      {totalCount === 0 ? (
        <EmptyState
          title="Bu pencerede kayda değer gelişme yok"
          description={`${meta.label} kategorisinde son 24 saatlik pencerede kriterleri karşılayan haber bulunmadı.`}
        />
      ) : category === 'accidents_and_incidents' ? (
        <div className="space-y-3">
          {[...categories.accidents_and_incidents]
            .sort((a, b) => b.importance - a.importance)
            .slice(0, limit ?? categories.accidents_and_incidents.length)
            .map((item) => (
              <AccidentCard key={item.id} item={item} />
            ))}
        </div>
      ) : (
        <div className="space-y-3">
          {[...categories[category]]
            .sort((a, b) => b.importance - a.importance)
            .slice(0, limit ?? categories[category].length)
            .map((item) => (
              <NewsCard key={item.id} item={item} category={category} />
            ))}
        </div>
      )}
    </section>
  );
}
