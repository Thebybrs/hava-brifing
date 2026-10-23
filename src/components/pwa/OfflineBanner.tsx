// src/components/pwa/OfflineBanner.tsx — §10 ve §11 Faz 7 Çevrimdışı önbellek bilgi şeridi

import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function OfflineBanner() {
  const online = useOnlineStatus();

  if (online) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-efb-amber/15 border-b border-efb-amber/40 text-efb-amber font-mono text-xs"
    >
      <div className="max-w-3xl mx-auto px-3 py-1.5 flex items-center justify-center gap-2">
        <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Çevrimdışı — önbellekten gösteriliyor</span>
      </div>
    </div>
  );
}
