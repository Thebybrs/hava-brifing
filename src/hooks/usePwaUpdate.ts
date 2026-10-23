// src/hooks/usePwaUpdate.ts — §10 ve §11 Faz 7 Service Worker yeni sürüm güncelleme yönetimi

import { useRegisterSW } from 'virtual:pwa-register/react';

export interface UsePwaUpdateResult {
  needRefresh: boolean;
  offlineReady: boolean;
  updateApp: () => Promise<void>;
  dismissUpdate: () => void;
}

export function usePwaUpdate(): UsePwaUpdateResult {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  const updateApp = async () => {
    await updateServiceWorker(true);
  };

  const dismissUpdate = () => {
    setNeedRefresh(false);
    setOfflineReady(false);
  };

  return {
    needRefresh,
    offlineReady,
    updateApp,
    dismissUpdate,
  };
}
