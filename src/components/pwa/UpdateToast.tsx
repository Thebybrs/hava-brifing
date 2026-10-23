// src/components/pwa/UpdateToast.tsx — §10 ve §11 Faz 7 "Yeni sürüm hazır" güncelleme bildirimi

import { RefreshCw, X } from 'lucide-react';
import { usePwaUpdate } from '@/hooks/usePwaUpdate';

export function UpdateToast() {
  const { needRefresh, updateApp, dismissUpdate } = usePwaUpdate();

  if (!needRefresh) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-20 inset-x-3 z-50 max-w-md mx-auto animate-fade-in"
    >
      <div className="bg-efb-panel2 border border-efb-cyan/60 border-l-[3px] border-l-efb-cyan rounded-md shadow-xl p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <RefreshCw
            className="w-4 h-4 text-efb-cyan shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <div className="font-mono text-xs font-bold text-efb-white">
              Yeni sürüm hazır
            </div>
            <div className="text-[11px] text-efb-muted truncate">
              Uygulamayı güncellemek için yenileyin
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => void updateApp()}
            className="px-2.5 py-1 rounded bg-efb-cyan/20 hover:bg-efb-cyan/30 border border-efb-cyan text-efb-cyan font-mono text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Yenile
          </button>
          <button
            type="button"
            onClick={dismissUpdate}
            aria-label="Güncelleme bildirimini kapat"
            className="p-1 rounded text-efb-muted hover:text-efb-white transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
