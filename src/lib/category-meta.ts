// src/lib/category-meta.ts — §9.1 ve §11 Faz 5 Kategori -> ikon, renk ve rota meta verileri

import {
  Cpu,
  Gauge,
  PlaneTakeoff,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import type { CategoryKey } from '@/types/briefing';

export interface CategoryMeta {
  key: CategoryKey;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  /** Metin renk sınıfı */
  colorClass: string;
  /** Sol şerit / kenarlık renk sınıfı */
  stripeClass: string;
  /** Rozet arka plan / çerçeve sınıfı */
  badgeClass: string;
  route: string;
}

export const CATEGORY_META: Record<CategoryKey, CategoryMeta> = {
  commercial_aviation: {
    key: 'commercial_aviation',
    label: 'Ticari Havacılık & Filo',
    shortLabel: 'Ticari',
    icon: PlaneTakeoff,
    colorClass: 'text-efb-cyan',
    stripeClass: 'border-l-efb-cyan',
    badgeClass: 'bg-efb-cyan/10 text-efb-cyan border-efb-cyan/30',
    route: '/c/commercial_aviation',
  },
  accidents_and_incidents: {
    key: 'accidents_and_incidents',
    label: 'Kaza, Kırım & Ciddi Olaylar',
    shortLabel: 'Kaza',
    icon: TriangleAlert,
    colorClass: 'text-efb-amber',
    stripeClass: 'border-l-efb-amber',
    badgeClass: 'bg-efb-amber/10 text-efb-amber border-efb-amber/30',
    route: '/c/accidents_and_incidents',
  },
  piloting_and_ops: {
    key: 'piloting_and_ops',
    label: 'Pilotaj, SOP, CRM & Regülasyon',
    shortLabel: 'Pilotaj',
    icon: Gauge,
    colorClass: 'text-efb-green',
    stripeClass: 'border-l-efb-green',
    badgeClass: 'bg-efb-green/10 text-efb-green border-efb-green/30',
    route: '/c/piloting_and_ops',
  },
  ai_developments: {
    key: 'ai_developments',
    label: 'Yapay Zeka & Geliştirici Araçları',
    shortLabel: 'AI',
    icon: Cpu,
    colorClass: 'text-efb-magenta',
    stripeClass: 'border-l-efb-magenta',
    badgeClass: 'bg-efb-magenta/10 text-efb-magenta border-efb-magenta/30',
    route: '/c/ai_developments',
  },
};

export function isCategoryKey(val: string | undefined): val is CategoryKey {
  if (!val) return false;
  return Object.prototype.hasOwnProperty.call(CATEGORY_META, val);
}
