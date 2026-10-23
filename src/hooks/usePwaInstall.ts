// src/hooks/usePwaInstall.ts — §10 ve §11 Faz 7 PWA kurulum (beforeinstallprompt + iOS tespiti)

import { useCallback, useEffect, useState } from 'react';

const INSTALL_DISMISSED_KEY = 'hava.pwa.install.dismissed.v1';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

function checkIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const isDisplayStandalone = window.matchMedia?.(
    '(display-mode: standalone)',
  ).matches;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return Boolean(isDisplayStandalone || nav.standalone);
}

function checkIsIos(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

function readDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(INSTALL_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export interface UsePwaInstallResult {
  canInstall: boolean;
  isIos: boolean;
  isStandalone: boolean;
  isDismissed: boolean;
  promptInstall: () => Promise<boolean>;
  dismissPrompt: () => void;
}

export function usePwaInstall(): UsePwaInstallResult {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(() =>
    checkIsStandalone(),
  );
  const [isIos] = useState<boolean>(() => checkIsIos());
  const [isDismissed, setIsDismissed] = useState<boolean>(() =>
    readDismissed(),
  );

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return choice.outcome === 'accepted';
  }, [deferredPrompt]);

  const dismissPrompt = useCallback(() => {
    setIsDismissed(true);
    try {
      window.localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
    } catch {
      // ignore storage errors
    }
  }, []);

  return {
    canInstall: deferredPrompt !== null && !isStandalone,
    isIos,
    isStandalone,
    isDismissed,
    promptInstall,
    dismissPrompt,
  };
}
