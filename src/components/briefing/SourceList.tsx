// src/components/briefing/SourceList.tsx — §11 Faz 6 Kaynak adı + dış link (target="_blank" rel="noopener noreferrer") + WEB rozeti

import { ExternalLink } from 'lucide-react';
import { formatZulu } from '@/lib/format';
import type { SourceRef } from '@/types/briefing';

export interface SourceListProps {
  sources: SourceRef[];
  className?: string;
}

export function SourceList({ sources, className = '' }: SourceListProps) {
  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-2 pt-2 border-t border-efb-line/70 ${className}`.trim()}
      aria-label="Haber kaynakları"
    >
      <span className="font-mono text-[10px] uppercase tracking-widest text-efb-muted">
        KAYNAK:
      </span>
      {sources.map((src, idx) => (
        <a
          key={`${src.url}-${idx}`}
          href={src.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-efb-bg/80 hover:bg-efb-panel2 border border-efb-line hover:border-efb-cyan/50 text-xs font-mono text-efb-cyan transition-colors max-w-full"
        >
          <span className="truncate max-w-[180px] sm:max-w-[240px]">
            {src.name}
          </span>
          {src.origin === 'grounding' && (
            <span className="px-1 py-0.2 rounded bg-efb-cyan/15 border border-efb-cyan/40 text-[9px] font-bold uppercase tracking-wider text-efb-cyan">
              WEB
            </span>
          )}
          {src.published_at && (
            <span className="text-[10px] text-efb-muted">
              {formatZulu(src.published_at)}
            </span>
          )}
          <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}
