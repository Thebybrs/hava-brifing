// src/lib/storage.ts — §9.5 localStorage okundu işaretleri (hava.read.v1) ve kullanıcı ayarları

const READ_STORAGE_KEY = 'hava.read.v1';
const SETTINGS_STORAGE_KEY = 'hava.settings.v1';

export type FontScaleSetting = 'normal' | 'large';

export interface UserSettings {
  fontScale: FontScaleSetting;
}

const DEFAULT_SETTINGS: UserSettings = {
  fontScale: 'normal',
};

export function getReadItemIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(READ_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter((item): item is string => typeof item === 'string'),
    );
  } catch {
    return new Set();
  }
}

export function isItemRead(id: string): boolean {
  return getReadItemIds().has(id);
}

export function markItemRead(id: string): Set<string> {
  const current = getReadItemIds();
  current.add(id);
  persistReadSet(current);
  return current;
}

export function toggleItemRead(id: string): boolean {
  const current = getReadItemIds();
  const nextState = !current.has(id);
  if (nextState) {
    current.add(id);
  } else {
    current.delete(id);
  }
  persistReadSet(current);
  return nextState;
}

export function clearReadItems(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(READ_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

function persistReadSet(set: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    // Son 1000 öğe sınırıyla sakla
    const arr = Array.from(set).slice(-1000);
    window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // ignore quota errors
  }
}

export function getUserSettings(): UserSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return {
      fontScale: parsed.fontScale === 'large' ? 'large' : 'normal',
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveUserSettings(settings: UserSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage errors
  }
}
