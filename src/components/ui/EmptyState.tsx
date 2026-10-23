// src/components/ui/EmptyState.tsx — Boş kategori / veri yok durumu

import { Info } from 'lucide-react';
import { Panel } from './Panel';

export interface EmptyStateProps {
  title?: string;
  description?: string;
}

export function EmptyState({
  title = 'Kayıt Bulunamadı',
  description = 'Bu zaman penceresinde kayda değer bir gelişme raporlanmadı.',
}: EmptyStateProps) {
  return (
    <Panel className="p-4 flex items-start gap-3">
      <Info className="w-4 h-4 text-efb-muted shrink-0 mt-0.5" />
      <div>
        <div className="text-xs font-mono uppercase tracking-wider text-efb-text">
          {title}
        </div>
        <p className="text-xs text-efb-muted mt-0.5">{description}</p>
      </div>
    </Panel>
  );
}
