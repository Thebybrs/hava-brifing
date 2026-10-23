// src/components/layout/AppShell.tsx — §9.3 ve §11 Faz 7 Ana EFB uygulama kabuğu (TopBar + StatusStrip + OfflineBanner + InstallPrompt + Outlet + UpdateToast + BottomNav)

import { Outlet } from 'react-router-dom';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { OfflineBanner } from '@/components/pwa/OfflineBanner';
import { UpdateToast } from '@/components/pwa/UpdateToast';
import { useBriefing } from '@/hooks/useBriefing';
import { BottomNav } from './BottomNav';
import { StatusStrip } from './StatusStrip';
import { TopBar } from './TopBar';

export function AppShell() {
  const { status, data } = useBriefing();

  return (
    <div className="min-h-screen flex flex-col bg-efb-bg text-efb-text">
      <TopBar activeDate={data?.date} />
      <StatusStrip status={status} briefing={data} />
      <OfflineBanner />
      <InstallPrompt />

      <main className="flex-1 max-w-3xl w-full mx-auto px-3 pt-4 pb-24">
        <Outlet />
      </main>

      <UpdateToast />
      <BottomNav />
    </div>
  );
}
