// src/pages/SettingsPage.tsx — §9.4 ve §11 Faz 7 EFB Sistem Ayarları, PWA Kurulumu, Önbellek Yönetimi ve Veri Hattı Durumu

import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Download,
   Smartphone,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { DataField } from '@/components/ui/DataField';
import { Panel } from '@/components/ui/Panel';
import { useBriefing } from '@/hooks/useBriefing';
import { useBriefingIndex } from '@/hooks/useBriefingIndex';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { formatTrt, formatZulu } from '@/lib/format';
import {
  clearReadItems,
  getReadItemIds,
  getUserSettings,
  saveUserSettings,
  type FontScaleSetting,
} from '@/lib/storage';

export function SettingsPage() {
  const { data: manifest } = useBriefingIndex();
  const { data: latestBriefing } = useBriefing();
  const { canInstall, isIos, isStandalone, promptInstall } = usePwaInstall();

  const [readCount, setReadCount] = useState<number>(
    () => getReadItemIds().size,
  );
  const [fontScale, setFontScale] = useState<FontScaleSetting>(
    () => getUserSettings().fontScale,
  );
  const [clearingCache, setClearingCache] = useState<boolean>(false);

  const handleClearRead = () => {
    clearReadItems();
    setReadCount(0);
  };

  const handleFontScaleChange = (next: FontScaleSetting) => {
    setFontScale(next);
    saveUserSettings({ fontScale: next });
    if (typeof document !== 'undefined') {
      document.documentElement.style.fontSize =
        next === 'large' ? '17px' : '16px';
    }
  };

  const handleClearCaches = async () => {
    setClearingCache(true);
    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.map((key) => window.caches.delete(key)));
      }
      window.location.reload();
    } catch {
      setClearingCache(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Genel EFB Sistem Bilgileri ve Görünüm */}
      <Panel accent="cyan" className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-base sm:text-lg font-semibold text-efb-white">
            EFB Sistem Ayarları
          </h1>
          <span className="font-mono text-xs text-efb-cyan">
            ŞEMA v{manifest?.schema_version ?? 1}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <DataField
            label="SON BRİFİNG"
            value={manifest?.latest ?? '—'}
            tone="cyan"
          />
          <DataField
            label="SON GÜNCELLEME"
            value={
              manifest?.updated_at
                ? `${formatTrt(manifest.updated_at)} (${formatZulu(manifest.updated_at)})`
                : '—'
            }
          />
          <DataField
            label="ARŞİV GÜN SAYISI"
            value={manifest?.briefings.length ?? 0}
          />
          <DataField label="OKUNAN HABER" value={readCount} />
        </div>

        {/* Yazı Boyutu */}
        <div className="pt-3 border-t border-efb-line flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-medium text-efb-white">
              Kokpit Yazı Ölçeği
            </div>
            <div className="text-[11px] text-efb-muted">
              Okuma ergonomisi için temel metin boyutunu ayarlayın
            </div>
          </div>
          <div className="inline-flex rounded border border-efb-line bg-efb-bg p-0.5 font-mono text-xs">
            <button
              type="button"
              onClick={() => handleFontScaleChange('normal')}
              className={`px-3 py-1 rounded transition-colors ${
                fontScale === 'normal'
                  ? 'bg-efb-cyan/20 text-efb-cyan font-bold'
                  : 'text-efb-muted hover:text-efb-white'
              }`}
            >
              STANDART
            </button>
            <button
              type="button"
              onClick={() => handleFontScaleChange('large')}
              className={`px-3 py-1 rounded transition-colors ${
                fontScale === 'large'
                  ? 'bg-efb-cyan/20 text-efb-cyan font-bold'
                  : 'text-efb-muted hover:text-efb-white'
              }`}
            >
              BÜYÜK
            </button>
          </div>
        </div>

        {/* Okundu İşaretleri & Önbellek */}
        <div className="pt-3 border-t border-efb-line flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-efb-muted">
            Yerel okundu kayıtları ve çevrimdışı PWA önbelleği
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleClearRead}
              className="px-3 py-1.5 rounded bg-efb-panel2 hover:bg-efb-line border border-efb-line font-mono text-xs text-efb-text transition-colors"
            >
              Okunanları Sıfırla ({readCount})
            </button>
            <button
              type="button"
              disabled={clearingCache}
              onClick={() => void handleClearCaches()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-efb-red/10 hover:bg-efb-red/20 border border-efb-red/40 font-mono text-xs text-efb-red transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {clearingCache ? 'Temizleniyor...' : 'Önbelleği Temizle'}
              </span>
            </button>
          </div>
        </div>
      </Panel>

      {/* 2. Uygulamayı Yükle (PWA) */}
      <Panel accent="green" className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-efb-green" aria-hidden="true" />
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-efb-white">
            Uygulamayı Yükle (PWA)
          </h2>
        </div>

        {isStandalone ? (
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded bg-efb-green/10 border border-efb-green/30 font-mono text-xs text-efb-green">
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              Uygulama cihazınızda bağımsız (Standalone EFB) modda çalışıyor.
            </span>
          </div>
        ) : canInstall ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-efb-muted">
              Hava Brifing uygulamasını cihazınıza kurarak uçuşta çevrimdışı
              modda ve tam ekran EFB görünümünde kullanabilirsiniz.
            </p>
            <button
              type="button"
              onClick={() => void promptInstall()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-efb-green/15 hover:bg-efb-green/25 border border-efb-green text-efb-green font-mono text-xs font-bold uppercase tracking-wider transition-colors"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Ana Ekrana Yükle</span>
            </button>
          </div>
        ) : isIos ? (
          <p className="text-xs text-efb-muted leading-relaxed">
            iOS / iPadOS kurulumu için Safari alt çubuğundaki{' '}
            <strong className="text-efb-white">Paylaş</strong> düğmesine
            dokunun ve listeden{' '}
            <strong className="text-efb-cyan">Ana Ekrana Ekle</strong>{' '}
            seçeneğini seçin.
          </p>
        ) : (
          <p className="text-xs text-efb-muted leading-relaxed">
            Tarayıcınızın adres çubuğundaki{' '}
            <strong className="text-efb-white">Uygulamayı Yükle</strong>{' '}
            simgesini veya tarayıcı menüsündeki{' '}
            <strong className="text-efb-cyan">Ana Ekrana Ekle</strong>{' '}
            seçeneğini kullanarak kurulum yapabilirsiniz.
          </p>
        )}
      </Panel>

      {/* 3. Sistem / Veri Hattı Durumu (Teknik Uyarılar ve Pipeline Telemetrisi) */}
      <Panel accent="amber" className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-efb-amber" aria-hidden="true" />
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-efb-white">
              Sistem / Veri Hattı Durumu
            </h2>
          </div>
          {latestBriefing && (
            <span className="font-mono text-[11px] text-efb-muted">
              SÜRE: {(latestBriefing.meta.duration_ms / 1000).toFixed(1)} sn
            </span>
          )}
        </div>

        {latestBriefing ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <DataField
                label="SAĞLIKLI RSS"
                value={`${latestBriefing.meta.rss_feeds_ok} Kaynak`}
                tone="green"
              />
              <DataField
                label="HABER SEÇİMİ"
                value={`${latestBriefing.meta.rss_items_used} / ${latestBriefing.meta.rss_items_fetched}`}
                tone="cyan"
              />
              <DataField
                label="WEB GROUNDING"
                value={latestBriefing.meta.grounding_used ? 'AKTİF' : 'KAPALI'}
                tone={latestBriefing.meta.grounding_used ? 'green' : 'default'}
              />
              <DataField
                label="MODEL"
                value={latestBriefing.model}
              />
            </div>

            {latestBriefing.warnings.length > 0 ? (
              <div className="bg-efb-amber/10 border border-efb-amber/30 rounded p-2.5 space-y-1">
                <div className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-efb-amber font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>
                    VERİ HATTI NOTLARI ({latestBriefing.warnings.length})
                  </span>
                </div>
                <ul className="space-y-0.5 font-mono text-[11px] text-efb-muted">
                  {latestBriefing.warnings.map((w, i) => (
                    <li key={i} className="break-words">
                      • {w}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded bg-efb-green/10 border border-efb-green/30 font-mono text-[11px] text-efb-green">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>
                  Son üretimde teknik uyarı kaydı yok — tüm aktif veri kaynakları
                  sağlıklı.
                </span>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-efb-muted font-mono">
            Aktif brifing telemetrisi henüz yüklenmedi.
          </p>
        )}
      </Panel>

      {/* 4. Sabah Bildirimleri Kurulum Notu (ntfy / Telegram) */}
      <Panel accent="magenta" className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-efb-magenta" aria-hidden="true" />
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-efb-white">
            Sabah 08:00 TRT Bildirimleri (ntfy / Telegram)
          </h2>
        </div>
        <p className="text-xs text-efb-muted leading-relaxed">
          Her sabah Türkiye saati ile 08:00&apos;de üretilen brifing özetini
          telefonunuza anlık bildirim olarak almak için{' '}
          <strong className="text-efb-white font-mono">ntfy</strong> mobil
          uygulamasında özel konunuza (<code className="text-efb-cyan">NTFY_TOPIC</code>)
          abone olabilir veya Telegram bot kanalınızı (<code className="text-efb-cyan">TELEGRAM_CHAT_ID</code>)
          yapılandırabilirsiniz.
        </p>
      </Panel>
    </div>
  );
}
