// src/components/metar/MetarWidget.tsx — EFB Kokpit Canlı METAR Çözücü Paneli

import {
  ChevronDown,
  ChevronUp,
  CloudSun,
  Info,
  RefreshCw,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { DataField } from '@/components/ui/DataField';
import { Panel } from '@/components/ui/Panel';
import {
  AIRFIELD_PRESETS,
  fetchLiveMetar,
  getFallbackMetar,
  parseMetar,
  type DecodedMetar,
  type FlightCategory,
} from '@/lib/metar';

const CATEGORY_STYLES: Record<FlightCategory, { badge: string; stripe: 'green' | 'cyan' | 'amber' | 'red' }> = {
  VFR: { badge: 'bg-efb-green/15 text-efb-green border-efb-green/40', stripe: 'green' },
  MVFR: { badge: 'bg-efb-cyan/15 text-efb-cyan border-efb-cyan/40', stripe: 'cyan' },
  IFR: { badge: 'bg-efb-amber/15 text-efb-amber border-efb-amber/40', stripe: 'amber' },
  LIFR: { badge: 'bg-efb-red/15 text-efb-red border-efb-red/50', stripe: 'red' },
};

export function MetarWidget() {
  const [selectedStation, setSelectedStation] = useState<string>('LTFM');
  const [metar, setMetar] = useState<DecodedMetar>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const cached = window.localStorage.getItem('efb_metar_LTFM');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.raw) {
            return parseMetar(parsed.raw, 'LTFM');
          }
        }
      }
    } catch {
      // Yut
    }
    return parseMetar(getFallbackMetar('LTFM'), 'LTFM');
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<boolean>(false);

  const loadStation = async (station: string) => {
    setLoading(true);
    try {
      const data = await fetchLiveMetar(station);
      setMetar(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStation(selectedStation);

    // Her 5 dakikada bir arka planda canlı güncelle
    const interval = setInterval(() => {
      void loadStation(selectedStation);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [selectedStation]);

  const catStyle = CATEGORY_STYLES[metar.category];

  return (
    <Panel accent={catStyle.stripe} className="p-4 space-y-3">
      {/* Üst Bar: Başlık + Meydan Butonları + Yenile */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CloudSun className="w-4 h-4 text-efb-cyan shrink-0" aria-hidden="true" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-efb-white">
            Canlı Kokpit METAR Çözücü
          </span>
          <span className="font-mono text-[10px] text-efb-muted hidden sm:inline">
            (NOAA Aviation Weather)
          </span>
        </div>

        {/* Meydan Hap Butonları */}
        <div className="flex items-center gap-1 bg-efb-bg/80 border border-efb-line rounded p-0.5">
          {Object.keys(AIRFIELD_PRESETS).map((code) => {
            const active = code === selectedStation;
            return (
              <button
                key={code}
                type="button"
                onClick={() => setSelectedStation(code)}
                className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold transition-colors ${
                  active
                    ? 'bg-efb-cyan/20 text-efb-cyan border border-efb-cyan/40'
                    : 'text-efb-muted hover:text-efb-white'
                }`}
              >
                {code}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => void loadStation(selectedStation)}
            disabled={loading}
            aria-label="METAR Yenile"
            className="p-1 text-efb-muted hover:text-efb-cyan transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-efb-cyan' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Meydan Bilgisi & Ham METAR Satırı */}
      <div className="bg-efb-bg/60 border border-efb-line/80 rounded p-2.5 space-y-1.5">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-efb-white font-semibold">{metar.stationName}</span>
          <span className={`px-2 py-0.2 rounded border text-[10px] font-bold font-mono ${catStyle.badge}`}>
            {metar.category}
          </span>
        </div>
        <div className="font-mono text-[11px] text-efb-cyan tracking-wider break-all bg-efb-panel/80 p-1.5 rounded border border-efb-line/50">
          {metar.raw}
        </div>
      </div>

      {/* Telemetri Kutuları (4'lü Izgara) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <DataField
          label="RÜZGAR"
          value={
            metar.windSpeedKt !== null
              ? `${metar.windDirectionDeg === 'VRB' ? 'VRB' : `${String(metar.windDirectionDeg).padStart(3, '0')}°`} / ${metar.windSpeedKt} kt`
              : '—'
          }
          tone={metar.windGustKt ? 'amber' : 'cyan'}
        />
        <DataField
          label="GÖRÜŞ"
          value={metar.visibilitySummary.includes('CAVOK') ? 'CAVOK (10k+)' : `${metar.visibilityMeters ?? '—'} m`}
          tone="default"
        />
        <DataField
          label="SICAKLIK / ÇİY"
          value={
            metar.temperatureC !== null && metar.dewpointC !== null
              ? `${metar.temperatureC}°C / ${metar.dewpointC}°C`
              : '—'
          }
        />
        <DataField
          label="QNH BASINÇ"
          value={metar.qnhHpa ? `${metar.qnhHpa} hPa` : '—'}
          tone={metar.qnhHpa && metar.qnhHpa < 1013 ? 'amber' : 'green'}
        />
      </div>

      {/* Akordeon Açılır Detay: Pilotaj Çözümlemesi & Mülakat Notu */}
      <div className="border-t border-efb-line/70 pt-2">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="w-full flex items-center justify-between text-xs font-mono text-efb-muted hover:text-efb-cyan transition-colors py-1"
        >
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <Info className="w-3.5 h-3.5 text-efb-cyan" aria-hidden="true" />
            <span>Pilotaj Çözümlemesi & Mülakat Notu</span>
          </span>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-efb-cyan" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
          )}
        </button>

        {expanded && (
          <div className="mt-2 p-3 rounded bg-efb-bg/70 border border-efb-line text-xs space-y-2 text-efb-text leading-relaxed animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
              <div>
                <span className="text-efb-muted">Rüzgar Durumu: </span>
                <span className="text-efb-white">{metar.windSummary}</span>
              </div>
              <div>
                <span className="text-efb-muted">Bulut / Tavan: </span>
                <span className="text-efb-white">{metar.cloudSummary}</span>
              </div>
              <div>
                <span className="text-efb-muted">Basınç Değeri: </span>
                <span className="text-efb-white">{metar.qnhSummary}</span>
              </div>
              <div>
                <span className="text-efb-muted">Uçuş Kuralı: </span>
                <span className="text-efb-white">{metar.categoryLabel}</span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-efb-cyan/5 border border-efb-cyan/25 space-y-1">
              <div className="font-mono text-[10px] uppercase tracking-wider text-efb-cyan font-bold">
                🎯 ADAY PİLOT İÇİN MÜLAKAT NOTU
              </div>
              <p className="text-xs text-efb-text">{metar.takeaway}</p>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
