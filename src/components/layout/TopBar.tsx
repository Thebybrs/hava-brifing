// src/components/layout/TopBar.tsx — §9.3 Sol: BRİFİNG logotipi + tarih, Sağ: ZULU saat + online/offline + Arşiv/Ayarlar

import { Archive, Plane, Settings } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useZuluClock } from '@/hooks/useZuluClock';
import { formatDateLong } from '@/lib/format';
import { MetarBadge } from './MetarBadge';

export interface TopBarProps {
  activeDate?: string;
}

export function TopBar({ activeDate }: TopBarProps) {
  const zulu = useZuluClock();
  const isOnline = useOnlineStatus();

  return (
    <header className="sticky top-0 z-30 bg-efb-panel/95 backdrop-blur border-b border-efb-line safe-top">
      <div className="max-w-3xl mx-auto px-2.5 sm:px-3 h-12 flex items-center justify-between gap-1.5 sm:gap-2">
        <Link
          to="/"
          className="flex items-center gap-1.5 sm:gap-2 min-w-0 group focus:outline-none shrink-0"
        >
          <span className="w-7 h-7 rounded bg-efb-panel2 border border-efb-line flex items-center justify-center text-efb-cyan group-hover:border-efb-cyan transition-colors shrink-0">
            <Plane className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <div className="font-mono text-xs font-bold tracking-wider sm:tracking-widest text-efb-white leading-none whitespace-nowrap">
              BRİFİNG <span className="text-efb-cyan font-normal">EFB</span>
            </div>
            <div className="text-[11px] text-efb-muted truncate max-w-[130px] sm:max-w-none leading-tight mt-0.5 hidden sm:block">
              {activeDate ? formatDateLong(activeDate) : 'Günlük Operasyon Özeti'}
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <MetarBadge icao="LTFM" />

          <div
            title={isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
            className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 rounded bg-efb-bg border border-efb-line font-mono text-[10px] sm:text-[11px] text-efb-white whitespace-nowrap"
          >
            <span
              className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 ${
                isOnline ? 'bg-efb-green' : 'bg-efb-amber'
              }`}
            />
            <span className="hidden sm:inline text-efb-muted">ZULU</span>
            <span>{zulu}</span>
          </div>

          <NavLink
            to="/archive"
            aria-label="Arşiv"
            title="Brifing Arşivi"
            className={({ isActive }) =>
              `w-8 h-8 sm:w-9 sm:h-9 rounded border flex items-center justify-center transition-colors shrink-0 ${
                isActive
                  ? 'bg-efb-panel2 border-efb-cyan text-efb-cyan'
                  : 'bg-efb-bg border-efb-line text-efb-muted hover:text-efb-text'
              }`
            }
          >
            <Archive className="w-4 h-4" />
          </NavLink>

          <NavLink
            to="/settings"
            aria-label="Ayarlar"
            title="Ayarlar"
            className={({ isActive }) =>
              `w-8 h-8 sm:w-9 sm:h-9 rounded border flex items-center justify-center transition-colors shrink-0 ${
                isActive
                  ? 'bg-efb-panel2 border-efb-cyan text-efb-cyan'
                  : 'bg-efb-bg border-efb-line text-efb-muted hover:text-efb-text'
              }`
            }
          >
            <Settings className="w-4 h-4" />
          </NavLink>
        </div>
      </div>
    </header>
  );
}
