// src/components/briefing/ConfidenceChip.tsx — §9.3 ECAM renk semantiğine göre doğruluk rozeti

import type { Confidence } from '@/types/briefing';

export interface ConfidenceChipProps {
  confidence: Confidence;
  className?: string;
}

const CONFIDENCE_CONFIG: Record<
  Confidence,
  { label: string; styleClass: string; dotClass: string }
> = {
  confirmed: {
    label: 'ONAYLI',
    styleClass: 'bg-efb-green/10 text-efb-green border border-efb-green/40',
    dotClass: 'bg-efb-green',
  },
  preliminary: {
    label: 'ÖN BİLGİ',
    styleClass: 'bg-efb-amber/10 text-efb-amber border border-efb-amber/40',
    dotClass: 'bg-efb-amber',
  },
  unverified: {
    label: 'DOĞRULANMADI',
    styleClass:
      'bg-efb-bg/70 text-efb-muted border border-dashed border-efb-muted/50',
    dotClass: 'bg-efb-muted',
  },
};

export function ConfidenceChip({
  confidence,
  className = '',
}: ConfidenceChipProps) {
  const cfg = CONFIDENCE_CONFIG[confidence];

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[10px] uppercase tracking-wider font-semibold ${cfg.styleClass} ${className}`.trim()}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`}
        aria-hidden="true"
      />
      <span>{cfg.label}</span>
    </span>
  );
}
