// src/components/ui/ErrorState.tsx — Hata durumu + Tekrar dene butonu

import { RotateCw, TriangleAlert } from 'lucide-react';
import { Panel } from './Panel';

export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <Panel accent="red" className="p-4">
      <div className="flex items-start gap-3">
        <TriangleAlert className="w-5 h-5 text-efb-red shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono uppercase tracking-wider text-efb-red font-semibold">
            ECAM UYARISI — VERİ ALINAMADI
          </div>
          <p className="text-sm text-efb-text mt-1 break-words">{message}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-efb-panel2 hover:bg-efb-line text-efb-cyan border border-efb-line font-mono text-xs transition-colors min-h-[36px]"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Tekrar dene</span>
            </button>
          )}
        </div>
      </div>
    </Panel>
  );
}
