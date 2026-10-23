// src/components/ui/DataField.tsx — §9.3 Üstte 10px uppercase etiket, altta mono beyaz değer

import type { ReactNode } from 'react';

export interface DataFieldProps {
  label: string;
  value: ReactNode;
  tone?: 'default' | 'cyan' | 'green' | 'amber' | 'red';
  className?: string;
}

const TONE_CLASS: Record<NonNullable<DataFieldProps['tone']>, string> = {
  default: 'text-efb-white',
  cyan: 'text-efb-cyan',
  green: 'text-efb-green',
  amber: 'text-efb-amber',
  red: 'text-efb-red',
};

export function DataField({
  label,
  value,
  tone = 'default',
  className = '',
}: DataFieldProps) {
  const displayValue =
    value === null || value === undefined || value === '' ? '—' : value;

  return (
    <div
      className={`bg-efb-bg/60 border border-efb-line/80 rounded px-2.5 py-1.5 ${className}`.trim()}
    >
      <div className="text-[10px] uppercase tracking-widest text-efb-muted leading-tight">
        {label}
      </div>
      <div
        className={`mt-0.5 font-mono text-xs font-semibold truncate ${TONE_CLASS[tone]}`}
      >
        {displayValue}
      </div>
    </div>
  );
}
