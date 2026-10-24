// @vitest-environment jsdom
// src/test/metar.test.ts — METAR ayrıştırıcı birim testleri

import { describe, expect, it } from 'vitest';
import { calculateFlightCategory, parseMetar } from '@/lib/metar';

describe('METAR Decoder (src/lib/metar.ts)', () => {
  it('1) İstanbul/LTFM gerçek METAR metnini doğru şekilde ayrıştırır', () => {
    const raw =
      'METAR LTFM 241450Z 06009KT 9999 SCT023 16/11 Q1018 NOSIG RMK RWY17L 07007KT';
    const data = parseMetar(raw);

    expect(data.station).toBe('LTFM');
    expect(data.airportName).toBe('İstanbul Havalimanı');
    expect(data.iata).toBe('IST');

    // Zaman
    expect(data.time?.day).toBe(24);
    expect(data.time?.zulu).toBe('14:50Z');

    // Rüzgar
    expect(data.wind?.direction).toBe(60);
    expect(data.wind?.speedKt).toBe(9);
    expect(data.wind?.isCalm).toBe(false);
    expect(data.wind?.display).toBe('060° 9 KT');

    // Görüş
    expect(data.visibility?.meters).toBe(10000);
    expect(data.visibility?.display).toBe('≥ 10 km (9999)');

    // Bulut (SCT023 tavan değildir; SCT = 3-4/8)
    expect(data.clouds).toHaveLength(1);
    expect(data.clouds?.[0]?.cover).toBe('SCT');
    expect(data.clouds?.[0]?.altitudeFt).toBe(2300);
    expect(data.ceilingFt).toBeNull();

    // Sıcaklık & QNH
    expect(data.temperature?.celsius).toBe(16);
    expect(data.temperature?.dewpointCelsius).toBe(11);
    expect(data.altimeter?.hPa).toBe(1018);

    // Trend & Uçuş Kategorisi (Tavan yok, görüş 9999 -> VFR)
    expect(data.trend).toContain('NOSIG');
    expect(data.flightCategory.category).toBe('VFR');
  });

  it('2) CAVOK ve sakin rüzgar (00000KT) durumunu doğru yorumlar', () => {
    const raw = 'LTFM 240600Z 00000KT CAVOK 14/08 Q1020 NOSIG';
    const data = parseMetar(raw);

    expect(data.wind?.isCalm).toBe(true);
    expect(data.wind?.display).toBe('Sakin (Calm)');
    expect(data.visibility?.isCavok).toBe(true);
    expect(data.flightCategory.category).toBe('VFR');
  });

  it('3) Hamleli rüzgar (Gust), değişken yön ve eksi dereceleri çözer', () => {
    const raw = 'LTFM 241800Z 27018G28KT 240V300 6000 -RA BR BKN015 M02/M05 Q1008';
    const data = parseMetar(raw);

    expect(data.wind?.direction).toBe(270);
    expect(data.wind?.speedKt).toBe(18);
    expect(data.wind?.gustKt).toBe(28);
    expect(data.wind?.variable).toEqual({ min: 240, max: 300 });

    // Eksi sıcaklık
    expect(data.temperature?.celsius).toBe(-2);
    expect(data.temperature?.dewpointCelsius).toBe(-5);

    // Hava olayları
    expect(data.weather?.some((w) => w.code === '-RA')).toBe(true);
    expect(data.weather?.some((w) => w.code === 'BR')).toBe(true);

    // BKN015 tavan (1500 ft) -> MVFR (tavan <= 3000 ft)
    expect(data.ceilingFt).toBe(1500);
    expect(data.flightCategory.category).toBe('MVFR');
  });

  it('4) IFR ve LIFR kategorilerini tavan ve görüşe göre tespit eder', () => {
    // Görüş 3000m veya tavan 800 ft -> IFR
    expect(calculateFlightCategory(3000, 800, false)).toBe('IFR');

    // Görüş 800m veya tavan 300 ft -> LIFR
    expect(calculateFlightCategory(800, 300, false)).toBe('LIFR');

    // Görüş 6000m, tavan 2500 ft -> MVFR
    expect(calculateFlightCategory(6000, 2500, false)).toBe('MVFR');

    // Görüş 10000m, tavan 5000 ft -> VFR
    expect(calculateFlightCategory(10000, 5000, false)).toBe('VFR');
  });
});
