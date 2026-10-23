// src/components/pwa/InstallPrompt.tsx — §10 ve §11 Faz 7 Kapatılabilir PWA kurulum şeridi (Android/Desktop + iOS)

import { Download, Share, X } from 'lucide-react';
import { usePwaInstall } from '@/hooks/usePwaInstall';

export function InstallPrompt() {
  const {
    canInstall,
    isIos,
    isStandalone,
    isDismissed,
    promptInstall,
    dismissPrompt,
  } = usePwaInstall();

  if (isStandalone || isDismissed || (!canInstall && !isIos)) {
    return null;
  }

  return (
    <div className="bg-efb-panel2 border-b border-efb-line">
      <div className="max-w-3xl mx-auto px-3 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {isIos && !canInstall ? (
            <Share
              className="w-4 h-4 text-efb-cyan shrink-0"
              aria-hidden="true"
            />
          ) : (
            <Download
              className="w-4 h-4 text-efb-cyan shrink-0"
              aria-hidden="true"
            />
          )}
          <div className="text-xs text-efb-text min-w-0">
            {canInstall ? (
              <span>
                <strong className="text-efb-white font-semibold">
                  Hava Brifing EFB
                </strong>{' '}
                uygulamasını çevrimdışı erişim için ana ekrana ekleyin.
              </span>
            ) : (
              <span>
                iOS kurulumu: Tarayıcıda{' '}
                <strong className="text-efb-cyan font-mono">Paylaş</strong>{' '}
                menüsünden{' '}
                <strong className="text-efb-white">Ana Ekrana Ekle</strong>{' '}
                seçeneğine dokunun.
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {canInstall && (
            <button
              type="button"
              onClick={() => void promptInstall()}
              className="px-2.5 py-1 rounded bg-efb-cyan/15 hover:bg-efb-cyan/25 border border-efb-cyan text-efb-cyan font-mono text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              Yükle
            </button>
          )}
          <button
            type="button"
            onClick={dismissPrompt}
            aria-label="Kurulum önerisini kapat"
            className="p-1 rounded text-efb-muted hover:text-efb-white transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
