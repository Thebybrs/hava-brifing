// src/pages/BriefingByDatePage.tsx — §9.4 ve §11 Faz 6 Arşivden seçilen tarihe ait tam brifing sayfası

import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { CategorySection } from '@/components/briefing/CategorySection';
import { HeadlinePanel } from '@/components/briefing/HeadlinePanel';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useBriefing } from '@/hooks/useBriefing';
import { CATEGORY_KEYS } from '@/types/briefing';

export function BriefingByDatePage() {
  const { date } = useParams<{ date: string }>();
  const { status, data, error, refetch } = useBriefing(date);

  if (status === 'loading') {
    return (
      <div className="space-y-4">
        <Skeleton lines={5} />
        <Skeleton lines={4} />
      </div>
    );
  }

  if (status === 'error' || !data) {
    return (
      <ErrorState
        message={error ?? `${date ?? ''} tarihli brifing yüklenemedi.`}
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-xs font-mono">
        <Link
          to="/archive"
          className="inline-flex items-center gap-1.5 text-efb-cyan hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>ARŞİVE DÖN</span>
        </Link>
        <span className="text-efb-muted">KAYIT: {data.date}</span>
      </div>

      <HeadlinePanel briefing={data} badgeLabel={`ARŞİV KAYDI // ${data.date}`} />

      <div className="space-y-6">
        {CATEGORY_KEYS.map((categoryKey) => (
          <CategorySection
            key={categoryKey}
            category={categoryKey}
            categories={data.categories}
            showViewAll={false}
          />
        ))}
      </div>
    </div>
  );
}
