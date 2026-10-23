// src/components/ui/Panel.tsx — §9.3 İnce çizgili EFB paneli (opsiyonel 3px sol kategori/uyarı renk şeridi)

import type { ReactNode } from 'react';
import { CATEGORY_META } from '@/lib/category-meta';
import type { CategoryKey } from '@/types/briefing';

export type PanelAccent = CategoryKey | 'cyan' | 'green' | 'amber' | 'red' | 'magenta' | 'none';

export interface PanelProps {
  children: ReactNode;
  accent?: PanelAccent;
  elevated?: boolean;
  className?: string;
}

const ACCENT_STRIPE_CLASS: Record<PanelAccent, string> = {
  commercial_aviation: CATEGORY_META.commercial_aviation.stripeClass,
  accidents_and_incidents: CATEGORY_META.accidents_and_incidents.stripeClass,
  piloting_and_ops: CATEGORY_META.piloting_and_ops.stripeClass,
  ai_developments: CATEGORY_META.ai_developments.stripeClass,
  cyan: 'border-l-efb-cyan',
  green: 'border-l-efb-green',
  amber: 'border-l-efb-amber',
  red: 'border-l-efb-red',
  magenta: 'border-l-efb-magenta',
  none: '',
};

export function Panel({
  children,
  accent = 'none',
  elevated = false,
  className = '',
}: PanelProps) {
  const bgClass = elevated ? 'bg-efb-panel2' : 'bg-efb-panel';
  const stripe =
    accent !== 'none'
      ? `border-l-[3px] ${ACCENT_STRIPE_CLASS[accent]}`
      : '';

  return (
    <div
      className={`${bgClass} border border-efb-line rounded-md ${stripe} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
