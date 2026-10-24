// src/components/layout/MetarBadge.tsx — TopBar için İstanbul/LTFM canlı METAR kutusu ve sürüklenebilir detaylı popover kartı

import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Cloud,
  Copy,
  Eye,
  Gauge,
  GripHorizontal,
  RefreshCw,
  RotateCcw,
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
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    posX: number;
    posY: number;
  } | null>(null);

  // Başlangıç konumunu ekran ve buton konumuna göre hesapla
  const calculateDefaultPosition = () => {
    if (typeof window === 'undefined') return { x: 12, y: 56 };
    const btnRect = buttonRef.current?.getBoundingClientRect();
    const isMobile = window.innerWidth < 640;
    const cardWidth = isMobile ? Math.min(window.innerWidth - 24, 380) : 420;

    let initialX = btnRect
      ? btnRect.right - cardWidth
      : window.innerWidth - cardWidth - 16;
    let initialY = btnRect ? btnRect.bottom + 8 : 56;

    // Ekran dışına taşmayı engelle
    initialX = Math.max(12, Math.min(window.innerWidth - cardWidth - 12, initialX));
    initialY = Math.max(8, Math.min(window.innerHeight - 100, initialY));

    return { x: initialX, y: initialY };
  };

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
      setHasMoved(false);
      setPosition(null);
    } else {
      setPosition(calculateDefaultPosition());
      setHasMoved(false);
      setIsOpen(true);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setHasMoved(false);
    setPosition(null);
  };

  const handleResetPosition = () => {
    setPosition(calculateDefaultPosition());
    setHasMoved(false);
  };

  // Escape tuşu ile popover kapatma
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Kart henüz taşınmadıysa dışarı tıklama ile kapatma
  useEffect(() => {
    if (!isOpen || hasMoved || isDragging) return;

    function handleClickOutside(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (
        cardRef.current &&
        !cardRef.current.contains(target) &&
        containerRef.current &&
        !containerRef.current.contains(target)
      ) {
        handleClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, hasMoved, isDragging]);

  // Ekran boyutu değiştiğinde kartın görünür alanda kalmasını sağla
  useEffect(() => {
    function handleResize() {
      if (!isOpen || !position) return;
      const cardWidth = cardRef.current?.offsetWidth || 380;
      const maxX = Math.max(8, window.innerWidth - cardWidth - 8);
      const maxY = Math.max(8, window.innerHeight - 60);
      if (position.x > maxX || position.y > maxY) {
        setPosition((prev) =>
          prev
            ? {
                x: Math.min(prev.x, maxX),
                y: Math.min(prev.y, maxY),
              }
            : null,
        );
      }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, position]);

  // Sürükleme başlangıcı (Pointer / Mouse / Touch)
  const startDrag = (
    clientX: number,
    clientY: number,
    target: HTMLElement,
    isMouse: boolean,
    button: number,
  ) => {
    if (isMouse && button !== 0) return;
    if (target.closest('button, a, input, select, textarea')) {
      return;
    }

    const currentX = position?.x ?? calculateDefaultPosition().x;
    const currentY = position?.y ?? calculateDefaultPosition().y;

    dragStartRef.current = {
      pointerX: clientX,
      pointerY: clientY,
      posX: currentX,
      posY: currentY,
    };
    setIsDragging(true);
  };

  // Sürükleme hareketi (Pointer / Mouse / Touch)
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (clientX: number, clientY: number) => {
      if (!dragStartRef.current) return;
      const dx = clientX - dragStartRef.current.pointerX;
      const dy = clientY - dragStartRef.current.pointerY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        setHasMoved(true);
      }

      const cardRect = cardRef.current?.getBoundingClientRect();
      const cardWidth = cardRect?.width || 380;
      const cardHeight = cardRect?.height || 360;

      let newX = dragStartRef.current.posX + dx;
      let newY = dragStartRef.current.posY + dy;

      const minX = 8;
      const maxX = Math.max(minX, window.innerWidth - cardWidth - 8);
      const minY = 8;
      const maxY = Math.max(minY, window.innerHeight - Math.min(cardHeight, 60));

      newX = Math.max(minX, Math.min(maxX, newX));
      newY = Math.max(minY, Math.min(maxY, newY));

      setPosition({ x: newX, y: newY });
    };

    const handlePointerMove = (e: PointerEvent | MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        handleMove(touch.clientX, touch.clientY);
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    window.addEventListener('pointerup', handleEnd);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('pointercancel', handleEnd);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handleTouchMove);

      window.removeEventListener('pointerup', handleEnd);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('pointercancel', handleEnd);
    };
  }, [isDragging]);

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
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title="İstanbul Havalimanı (LTFM) Canlı METAR — Detaylar için tıklayın"
        className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 rounded bg-efb-bg border font-mono text-[10px] sm:text-[11px] text-efb-white transition-all cursor-pointer select-none group focus:outline-none focus:ring-1 focus:ring-efb-cyan shrink-0 ${
          isOpen
            ? 'border-efb-cyan bg-efb-panel2 text-efb-cyan'
            : 'border-efb-line hover:border-efb-cyan/60 hover:bg-efb-panel2'
        }`}
      >
        {/* Durum Gösterge Noktası */}
        <span
          className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 transition-colors ${
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
            <span className="text-efb-text sm:hidden font-medium text-[10px]">
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

      {/* 2. Sürüklenebilir Açılır Popover Modal / Detay Kartı */}
      {isOpen && (
        <div
          ref={cardRef}
          role="dialog"
          aria-label={`${icao} METAR Raporu`}
          style={
            position
              ? {
                  position: 'fixed',
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                }
              : undefined
          }
          className={`fixed z-50 w-[calc(100vw-24px)] max-w-sm sm:w-[420px] bg-efb-panel border rounded-lg p-4 space-y-3 font-mono transition-shadow duration-150 ${
            isDragging
              ? 'border-efb-cyan shadow-cyan-950/60 ring-2 ring-efb-cyan/40 select-none shadow-2xl'
              : 'border-efb-line shadow-2xl'
          } ${!position ? 'top-14 right-3 sm:right-6' : ''}`}
        >
          {/* Sürüklenebilir Başlık Alanı (Drag Handle) */}
          <div
            onPointerDown={(e) =>
              startDrag(
                e.clientX,
                e.clientY,
                e.target as HTMLElement,
                e.pointerType === 'mouse',
                e.button,
              )
            }
            onMouseDown={(e) =>
              startDrag(
                e.clientX,
                e.clientY,
                e.target as HTMLElement,
                true,
                e.button,
              )
            }
            onTouchStart={(e) => {
              const touch = e.touches[0];
              if (touch) {
                startDrag(
                  touch.clientX,
                  touch.clientY,
                  e.target as HTMLElement,
                  false,
                  0,
                );
              }
            }}
            onDoubleClick={handleResetPosition}
            title="Pencereyi taşımak için sürükleyin (Sıfırlamak için çift tıklayın)"
            className="flex items-start justify-between gap-2 border-b border-efb-line/80 pb-2.5 cursor-grab active:cursor-grabbing select-none touch-none group"
          >
            <div className="flex items-start gap-2 min-w-0">
              <span className="p-1 rounded bg-efb-panel2 border border-efb-line text-efb-muted group-hover:text-efb-cyan transition-colors shrink-0 mt-0.5">
                <GripHorizontal className="w-3.5 h-3.5" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
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
                <div className="text-[11px] text-efb-muted font-sans mt-0.5 truncate">
                  {data?.airportName || 'İstanbul Havalimanı'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {hasMoved && (
                <button
                  type="button"
                  onClick={handleResetPosition}
                  title="Başlangıç konumuna sıfırla"
                  aria-label="Konumu sıfırla"
                  className="w-7 h-7 rounded border border-efb-line/60 bg-efb-bg text-efb-muted hover:text-efb-cyan hover:border-efb-cyan flex items-center justify-center transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={handleClose}
                aria-label="Kapat"
                className="w-7 h-7 rounded border border-efb-line/60 bg-efb-bg text-efb-muted hover:text-efb-white hover:border-efb-cyan flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
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
            <div className="bg-efb-bg/95 border border-efb-line rounded p-2 text-[11px] text-efb-text select-all break-words leading-relaxed max-h-24 overflow-y-auto">
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
      )}
    </div>
  );
}
