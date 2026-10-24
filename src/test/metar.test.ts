// src/test/metar.test.ts — METAR parser birim testleri

import { describe, expect, it } from 'vitest';
import { parseMetar } from '@/lib/metar';

describe('METAR Parser (src/lib/metar.ts)', () => {
  it('1) Standart LTFM METAR verisini doğru rüzgar, görüş ve QNH ile çözümler', () => {
    const raw = 'LTFM 241820Z 04012KT 9999 FEW030 14/08 Q1022 NOSIG';
    const decoded = parseMetar(raw, 'LTFM');

    expect(decoded.station).toBe('LTFM');
    expect(decoded.timeFormatted).toBe('18:20Z');
    expect(decoded.windDirectionDeg).toBe(40);
    expect(decoded.windSpeedKt).toBe(12);
    expect(decoded.windGustKt).toBeNull();
    expect(decoded.visibilityMeters).toBe(9999);
    expect(decoded.qnhHpa).toBe(1022);
    expect(decoded.temperatureC).toBe(14);
    expect(decoded.dewpointC).toBe(8);
    expect(decoded.category).toBe('VFR');
    expect(decoded.takeaway).toContain('QNH 1022');
  });

  it('2) CAVOK ve değişken rüzgarlı LTAI METAR verisini çözümler', () => {
    const raw = 'LTAI 241820Z VRB03KT CAVOK 19/11 Q1019 NOSIG';
    const decoded = parseMetar(raw, 'LTAI');

    expect(decoded.station).toBe('LTAI');
    expect(decoded.windDirectionDeg).toBe('VRB');
    expect(decoded.windSpeedKt).toBe(3);
    expect(decoded.visibilitySummary).toContain('CAVOK');
    expect(decoded.category).toBe('VFR');
  });

  it('3) Düşük tavan ve kısıtlı görüşte IFR / LIFR uçuş kategorisini doğru hesaplar', () => {
    // 800 metre görüş, 300 ft kapalı bulut (OVC003) -> LIFR
    const rawLifr = 'LTFJ 240500Z 02015G25KT 0800 FG OVC003 04/04 Q1008 NOSIG';
    const decodedLifr = parseMetar(rawLifr, 'LTFJ');

    expect(decodedLifr.category).toBe('LIFR');
    expect(decodedLifr.windGustKt).toBe(25);
    expect(decodedLifr.ceilingFeet).toBe(300);
    expect(decodedLifr.weatherPhenomena).toContain('Sis');
  });

  it('4) Eksi sıcaklık ve alçak basınç durumlarını doğru işler', () => {
    const rawSubZero = 'LTAC 240400Z 00000KT 6000 BR SCT020 M03/M05 Q1005';
    const decoded = parseMetar(rawSubZero, 'LTAC');

    expect(decoded.windSummary).toContain('Calm');
    expect(decoded.temperatureC).toBe(-3);
    expect(decoded.dewpointC).toBe(-5);
    expect(decoded.qnhHpa).toBe(1005);
    expect(decoded.qnhSummary).toContain('Alçak Basınç');
    expect(decoded.weatherPhenomena).toContain('Pus');
  });
});
