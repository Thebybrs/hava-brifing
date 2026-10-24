// src/components/layout/MetarBadge.tsx — TopBar için İstanbul/LTFM canlı METAR kutusu ve detaylı popover kartı

import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Cloud,
  Copy,
  Eye,
  Gauge,
  RefreshCw,
  Thermometer,
  Wind,
  X,
} from 'lucide-react';
import { useMetar } from '@/hooks/useMetar';
import { relativeTime } from '@/lib/format';

export interface MetarBadgeProps {
  icao?: string;
  className?: string;
}

export function MetarBadge({ icao = 'LTFM', className = '' }: MetarBadgeProps) {
  const { data, raw, isLoading, error, lastUpdated, isCached, refetch } =
    useMetar({ icao });

  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Escape tuşu ile popover kapatma
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleCopy = async () => {
    if (!raw) return;
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Pano erişim hatası yutulur
    }
  };

  const flightCat = data?.flightCategory;

  // Mini kutu rüzgar özeti
  const miniWind = data?.wind
    ? data.wind.isCalm
      ? 'CALM'
      : `${String(data.wind.direction).padStart(3, '0')}/${data.wind.speedKt}kt`
    : null;

  // Mini kutu sıcaklık özeti
  const miniTemp =
    data?.temperature !== undefined ? `${data.temperature.celsius}°` : null;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 1. TopBar Küçük METAR Kutusu (Kompakt Buton) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title="İstanbul Havalimanı (LTFM) Canlı METAR — Detaylar için tıklayın"
        className={`flex items-center gap-1.5 px-2 py-1 rounded bg-efb-bg border font-mono text-[11px] text-efb-white transition-all cursor-pointer select-none group focus:outline-none focus:ring-1 focus:ring-efb-cyan ${
          isOpen
            ? 'border-efb-cyan bg-efb-panel2 text-efb-cyan'
            : 'border-efb-line hover:border-efb-cyan/60 hover:bg-efb-panel2'
        }`}
      >
        {/* Durum Gösterge Noktası */}
        <span
          className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
            isLoading && !data
              ? 'bg-efb-muted animate-ping'
              : flightCat?.dotClass || 'bg-efb-green'
          }`}
        />

        {/* İstasyon Adı */}
        <span className="font-bold tracking-wider text-efb-white group-hover:text-efb-cyan transition-colors">
          {icao}
        </span>

        {/* Hava Durumu Mini Özeti */}
        {data ? (
          <>
            {/* Küçük Ekranlar (Yalnızca Sıcaklık veya Kategori) */}
            <span className="text-efb-text sm:hidden font-medium">
              {miniTemp ?? flightCat?.category}
            </span>

            {/* Geniş Ekranlar (Rüzgar + Sıcaklık + Kategori Rozeti) */}
            <span className="hidden sm:inline-flex items-center gap-1.5 text-efb-muted">
              {miniWind && <span>{miniWind}</span>}
              {miniTemp && (
                <span className="text-efb-text font-medium">{miniTemp}C</span>
              )}
              {flightCat && (
                <span
                  className={`px-1 py-0.5 rounded text-[9px] font-bold leading-none ${flightCat.badgeClass}`}
                >
                  {flightCat.category}
                </span>
              )}
            </span>
          </>
        ) : isLoading ? (
          <span className="text-efb-muted text-[10px] animate-pulse">...</span>
        ) : (
          <span className="text-efb-amber text-[10px]">METAR</span>
        )}
      </button>

      {/* 2. Açılır Popover Modal / Detay Kartı */}
      {isOpen && (
        <>
          {/* Arka plan tıklama katmanı (Backdrop) */}
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] transition-opacity"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Kart Gövdesi */}
          <div
            role="dialog"
            aria-label={`${icao} METAR Raporu`}
            className="fixed sm:absolute right-3 sm:right-0 top-14 sm:top-full mt-1.5 z-50 w-[calc(100vw-24px)] max-w-sm sm:w-[420px] bg-efb-panel border border-efb-line rounded-lg shadow-2xl p-4 space-y-3 font-mono animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Başlık Alanı */}
            <div className="flex items-start justify-between gap-2 border-b border-efb-line/80 pb-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tracking-wider text-efb-white">
                    {icao} {data?.iata ? `/ ${data.iata}` : ''}
                  </span>
                  {flightCat && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${flightCat.badgeClass}`}
                    >
                      {flightCat.nameTr}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-efb-muted font-sans mt-0.5">
                  {data?.airportName || 'İstanbul Havalimanı'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Kapat"
                className="w-7 h-7 rounded border border-efb-line/60 bg-efb-bg text-efb-muted hover:text-efb-white hover:border-efb-cyan flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ham METAR Satırı */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] tracking-wider text-efb-muted uppercase">
                <span>Ham METAR</span>
                {raw && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-efb-cyan hover:text-efb-white transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-efb-green" />
                        <span className="text-efb-green">KOPYALANDI</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>KOPYALA</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="bg-efb-bg/95 border border-efb-line rounded p-2 text-[11px] text-efb-text select-all break-words leading-relaxed">
                {raw || (error ? error : 'METAR verisi yükleniyor...')}
              </div>
            </div>

            {/* Ayrıştırılmış Veri Tablosu */}
            {data && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Rüzgar */}
                <div className="bg-efb-bg/60 border border-efb-line/80 rounded p-2">
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-efb-muted">
                    <Wind className="w-3 h-3 text-efb-cyan" />
                    <span>Rüzgar</span>
                  </div>
                  <div className="mt-1 font-semibold text-efb-white truncate">
                    {data.wind?.display || '—'}
                  </div>
                </div>

                {/* Görüş */}
                <div className="bg-efb-bg/60 border border-efb-line/80 rounded p-2">
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-efb-muted">
                    <Eye className="w-3 h-3 text-efb-cyan" />
                    <span>Görüş</span>
                  </div>
                  <div className="mt-1 font-semibold text-efb-white truncate">
                    {data.visibility?.display || '—'}
                  </div>
                </div>

                {/* Sıcaklık & İşba */}
                <div className="bg-efb-bg/60 border border-efb-line/80 rounded p-2">
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-efb-muted">
                    <Thermometer className="w-3 h-3 text-efb-cyan" />
                    <span>Sıcaklık / İşba</span>
                  </div>
                  <div className="mt-1 font-semibold text-efb-white">
                    {data.temperature ? (
                      <span>
                        {data.temperature.celsius}°C
                        <span className="text-efb-muted font-normal text-[11px] ml-1">
                          (İşba: {data.temperature.dewpointCelsius ?? '—'}°C)
                        </span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </div>
                </div>

                {/* Basınç / QNH */}
                <div className="bg-efb-bg/60 border border-efb-line/80 rounded p-2">
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-efb-muted">
                    <Gauge className="w-3 h-3 text-efb-cyan" />
                    <span>Altimetre (QNH)</span>
                  </div>
                  <div className="mt-1 font-semibold text-efb-white truncate">
                    {data.altimeter?.display || '—'}
                  </div>
                </div>

                {/* Bulut & Tavan */}
                <div className="bg-efb-bg/60 border border-efb-line/80 rounded p-2 col-span-2">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-efb-muted">
                    <span className="flex items-center gap-1">
                      <Cloud className="w-3 h-3 text-efb-cyan" />
                      <span>Bulut & Tavan (Ceiling)</span>
                    </span>
                    <span className="text-efb-text">
                      Tavan:{' '}
                      <span className="font-semibold text-efb-white">
                        {data.ceilingFt
                          ? `${data.ceilingFt.toLocaleString('tr-TR')} FT`
                          : 'Yok'}
                      </span>
                    </span>
                  </div>
                  <div className="mt-1 font-semibold text-efb-white text-[11px] truncate">
                    {data.clouds && data.clouds.length > 0
                      ? data.clouds
                          .map(
                            (c) =>
                              `${c.cover}${c.altitudeFt ? String(c.altitudeFt / 100).padStart(3, '0') : ''}${c.type || ''} (${c.coverLabelTr})`,
                          )
                          .join(', ')
                      : 'Açık / Belirgin Bulut Yok'}
                  </div>
                </div>

                {/* Hava Olayı (varsa) */}
                {data.weather && data.weather.length > 0 && (
                  <div className="bg-efb-bg/60 border border-efb-line/80 rounded p-2 col-span-2">
                    <div className="text-[10px] uppercase tracking-wider text-efb-muted">
                      Hava Olayı
                    </div>
                    <div className="mt-1 font-semibold text-efb-amber text-[11px]">
                      {data.weather
                        .map((w) => `${w.code} (${w.descriptionTr})`)
                        .join(', ')}
                    </div>
                  </div>
                )}

                {/* Gözlem Saati & Trend */}
                <div className="bg-efb-bg/60 border border-efb-line/80 rounded p-2 col-span-2 flex items-center justify-between text-[11px]">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-efb-muted block">
                      Gözlem Zamanı
                    </span>
                    <span className="text-efb-white font-semibold">
                      {data.time ? `${data.time.zulu} — ${data.time.trtFormatted}` : '—'}
                    </span>
                  </div>
                  {data.trend && (
                    <div className="text-right">
                      <span className="text-[10px] uppercase tracking-wider text-efb-muted block">
                        Trend
                      </span>
                      <span className="text-efb-cyan font-semibold">
                        {data.trend}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Alt Bilgi & Yenile Butonu */}
            <div className="pt-2 border-t border-efb-line/60 flex items-center justify-between text-[10px] text-efb-muted">
              <div>
                {isCached ? (
                  <span className="text-efb-amber">
                    ● Çevrimdışı (Önbellek)
                  </span>
                ) : lastUpdated ? (
                  <span>
                    ● Güncellendi: {relativeTime(lastUpdated.toISOString())}
                  </span>
                ) : (
                  <span>● NOAA / VATSIM</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => refetch()}
                disabled={isLoading}
                className="flex items-center gap-1 px-2 py-1 rounded bg-efb-bg border border-efb-line hover:border-efb-cyan text-efb-text hover:text-efb-white transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3 h-3 ${isLoading ? 'animate-spin text-efb-cyan' : ''}`}
                />
                <span>Yenile</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
