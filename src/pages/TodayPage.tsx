// src/pages/TodayPage.tsx — §9.4 ve §11 Faz 6 Bugün sayfası (HeadlinePanel + 4 CategorySection, ilk 3 öğe)

import { DailyKnowledgeCard } from '@/components/academy/DailyKnowledgeCard';
import { CategorySection } from '@/components/briefing/CategorySection';
import { HeadlinePanel } from '@/components/briefing/HeadlinePanel';
import { MetarWidget } from '@/components/metar/MetarWidget';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useBriefing } from '@/hooks/useBriefing';
import { CATEGORY_KEYS } from '@/types/briefing';

export function TodayPage() {
  const { status, data, error, refetch } = useBriefing();

  if (status === 'loading') {
    return (
      <div className="space-y-4">
        <Skeleton lines={5} />
        <Skeleton lines={4} />
        <Skeleton lines={4} />
      </div>
    );
  }

  if (status === 'error' || !data) {
    return (
      <ErrorState
        message={error ?? 'Günlük brifing yüklenemedi.'}
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Canlı Kokpit METAR Çözücü */}
      <MetarWidget />

      {/* 2. Pilot Akademi // Günün Havacılık Bilgisi (Günün Kartı) */}
      <DailyKnowledgeCard />

      {/* 3. Günün Manşeti ve Özeti */}
      <HeadlinePanel briefing={data} />

      {/* 4. Kategori Haber Bölümleri */}
      <div className="space-y-6">
        {CATEGORY_KEYS.map((categoryKey) => (
          <CategorySection
            key={categoryKey}
            category={categoryKey}
            categories={data.categories}
            limit={3}
            showViewAll={true}
          />
        ))}
      </div>
    </div>
  );
}
