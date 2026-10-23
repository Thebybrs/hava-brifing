// src/components/briefing/ImportanceBadge.tsx — §9.3 5 küçük sinyal çubuğu (5: kırmızı, 4: amber, ≤3: cyan)

import type { Importance } from '@/types/briefing';

export interface ImportanceBadgeProps {
  importance: Importance;
  className?: string;
}

const LEVELS: readonly Importance[] = [1, 2, 3, 4, 5];

function getActiveColorClass(importance: Importance): string {
  if (importance >= 5) return 'bg-efb-red';
  if (importance === 4) return 'bg-efb-amber';
  return 'bg-efb-cyan';
}

function getTextColorClass(importance: Importance): string {
  if (importance >= 5) return 'text-efb-red';
  if (importance === 4) return 'text-efb-amber';
  return 'text-efb-cyan';
}

export function ImportanceBadge({
  importance,
  className = '',
}: ImportanceBadgeProps) {
  const activeBarClass = getActiveColorClass(importance);
  const textClass = getTextColorClass(importance);

  return (
    <span
      role="img"
      aria-label={`Önem düzeyi: ${importance}/5`}
      title={`Önem düzeyi: ${importance}/5`}
      className={`inline-flex items-center gap-1.5 font-mono text-[10px] ${className}`.trim()}
    >
      <span className="inline-flex items-end gap-[2px] h-3" aria-hidden="true">
        {LEVELS.map((level) => {
          const isFilled = level <= importance;
          const heightClass =
            level === 1
              ? 'h-1.5'
              : level === 2
                ? 'h-2'
                : level === 3
                  ? 'h-2.5'
                  : level === 4
                    ? 'h-3'
                    : 'h-3.5';
          return (
            <span
              key={level}
              className={`w-1 rounded-[1px] transition-colors ${heightClass} ${
                isFilled ? activeBarClass : 'bg-efb-line'
              }`}
            />
          );
        })}
      </span>
      <span className={`font-bold ${textClass}`}>P{importance}</span>
    </span>
  );
}
