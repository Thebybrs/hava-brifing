// src/lib/metar.ts — Havacılık METAR çözücü (Decoder) ve formatlayıcı

import type { CloudLayer, FlightCategory, MetarData, WindData } from '@/types/metar';

const KNOWN_AIRPORTS: Record<string, { name: string; iata: string }> = {
  LTFM: { name: 'İstanbul Havalimanı', iata: 'IST' },
  LTBA: { name: 'Atatürk Havalimanı', iata: 'ISL' },
  LTFJ: { name: 'Sabiha Gökçen Havalimanı', iata: 'SAW' },
  LTAI: { name: 'Antalya Havalimanı', iata: 'AYT' },
  LTAC: { name: 'Ankara Esenboğa Havalimanı', iata: 'ESB' },
  LTBJ: { name: 'İzmir Adnan Menderes Havalimanı', iata: 'ADB' },
};

const WEATHER_TRANSLATIONS: Record<string, string> = {
  '-RA': 'Hafif Yağmur',
  RA: 'Yağmur',
  '+RA': 'Kuvvetli Yağmur',
  '-DZ': 'Hafif Çisenti',
  DZ: 'Çisenti',
  '+DZ': 'Kuvvetli Çisenti',
  '-SN': 'Hafif Kar',
  SN: 'Kar',
  '+SN': 'Kuvvetli Kar',
  SG: 'Kar Greni',
  IC: 'Buz Kristalleri',
  PL: 'Buz Paletleri',
  GR: 'Dolu',
  GS: 'Küçük Dolu',
  '-SHRA': 'Hafif Sağanak Yağmur',
  SHRA: 'Sağanak Yağmur',
  '+SHRA': 'Kuvvetli Sağanak',
  '-SHSN': 'Hafif Kar Sağanağı',
  SHSN: 'Kar Sağanağı',
  '+SHSN': 'Kuvvetli Kar Sağanağı',
  TS: 'Oraj',
  TSRA: 'Orajlı Yağmur',
  '+TSRA': 'Kuvvetli Orajlı Yağmur',
  '-TSRA': 'Hafif Orajlı Yağmur',
  TSSN: 'Orajlı Kar',
  VCTS: 'Civarda Oraj',
  VCSH: 'Civarda Sağanak',
  FG: 'Sis',
  FZFG: 'Dondurucu Sis',
  MIFG: 'Sığ Sis',
  BCFG: 'Parçalı Sis',
  BR: 'Pus',
  HZ: 'Pus / Duman',
  FU: 'Duman',
  VA: 'Volkanik Kül',
  DU: 'Yaygın Toz',
  SA: 'Kum',
  SQ: 'Bora (Squall)',
};

/**
 * Uçuş kategorisi meta verilerini döndürür (renk sınıfları ve Türkçe ad)
 */
export function getFlightCategoryMeta(category: FlightCategory) {
  switch (category) {
    case 'VFR':
      return {
        category,
        nameTr: 'VFR (Görerek Uçuş)',
        badgeClass: 'bg-efb-green/15 text-efb-green border border-efb-green/40',
        dotClass: 'bg-efb-green',
        textClass: 'text-efb-green',
      };
    case 'MVFR':
      return {
        category,
        nameTr: 'MVFR (Marjinal VFR)',
        badgeClass: 'bg-efb-cyan/15 text-efb-cyan border border-efb-cyan/40',
        dotClass: 'bg-efb-cyan',
        textClass: 'text-efb-cyan',
      };
    case 'IFR':
      return {
        category,
        nameTr: 'IFR (Aletli Uçuş)',
        badgeClass: 'bg-efb-amber/15 text-efb-amber border border-efb-amber/40',
        dotClass: 'bg-efb-amber',
        textClass: 'text-efb-amber',
      };
    case 'LIFR':
      return {
        category,
        nameTr: 'LIFR (Düşük IFR)',
        badgeClass: 'bg-efb-red/15 text-efb-red border border-efb-red/40',
        dotClass: 'bg-efb-red',
        textClass: 'text-efb-red',
      };
  }
}

/**
 * Tavan ve görüşe göre FAA/ICAO standart uçuş kategorisini belirler:
 * - LIFR: Tavan < 500 ft VEYA Görüş < 1600 m
 * - IFR: Tavan < 1000 ft VEYA Görüş < 4800 m
 * - MVFR: Tavan <= 3000 ft VEYA Görüş <= 8000 m
 * - VFR: Tavan > 3000 ft VE Görüş > 8000 m (veya CAVOK)
 */
export function calculateFlightCategory(
  visibilityMeters: number | undefined,
  ceilingFt: number | null | undefined,
  isCavok: boolean,
): FlightCategory {
  if (isCavok) return 'VFR';

  const vis = visibilityMeters ?? 10000;
  const ceil = ceilingFt ?? 99999;

  if (vis < 1600 || ceil < 500) {
    return 'LIFR';
  }
  if (vis < 4800 || ceil < 1000) {
    return 'IFR';
  }
  if (vis <= 8000 || ceil <= 3000) {
    return 'MVFR';
  }
  return 'VFR';
}

/**
 * Ham METAR metnini ayrıştırarak yapılandırılmış MetarData nesnesine çevirir.
 */
export function parseMetar(rawMetar: string): MetarData {
  const cleaned = rawMetar.trim().replace(/\s+/g, ' ');

  // 1. İstasyon Kodu (LTFM, LTBA vb.)
  const stationMatch = /(?:^|\s)(?:METAR|SPECI)?\s*([A-Z]{4})\b/.exec(cleaned);
  const station = stationMatch?.[1] ?? 'LTFM';
  const airportInfo = KNOWN_AIRPORTS[station] || {
    name: `${station} Meydanı`,
    iata: '',
  };

  // 2. Zaman (örn. 241450Z -> 24'ü 14:50 UTC)
  const timeMatch = /\b(\d{2})(\d{2})(\d{2})Z\b/.exec(cleaned);
  let time: MetarData['time'] | undefined;
  if (timeMatch && timeMatch[1] && timeMatch[2] && timeMatch[3]) {
    const day = parseInt(timeMatch[1], 10);
    const hour = parseInt(timeMatch[2], 10);
    const minute = parseInt(timeMatch[3], 10);

    const now = new Date();
    // UTC tarihi oluştur
    const utcDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, hour, minute),
    );

    // TRT Saati (UTC+3)
    const trtHour = (hour + 3) % 24;
    const trtFormatted = `${String(trtHour).padStart(2, '0')}:${String(minute).padStart(2, '0')} TRT`;

    time = {
      day,
      hour,
      minute,
      zulu: `${timeMatch[2]}:${timeMatch[3]}Z`,
      trtFormatted,
      isoDate: utcDate.toISOString(),
    };
  }

  // 3. Rüzgar (örn. 06009KT, 06015G25KT, VRB02KT, 00000KT)
  const windMatch = /\b(VRB|\d{3})(\d{2,3})(?:G(\d{2,3}))?KT\b/.exec(cleaned);
  let wind: WindData | undefined;
  if (windMatch && windMatch[1] && windMatch[2]) {
    const isCalm = windMatch[0] === '00000KT';
    const direction =
      windMatch[1] === 'VRB' ? 'VRB' : parseInt(windMatch[1], 10);
    const speedKt = parseInt(windMatch[2], 10);
    const gustKt = windMatch[3] ? parseInt(windMatch[3], 10) : undefined;

    // Değişken yön kontrolü (örn. 020V080)
    const varMatch = /\b(\d{3})V(\d{3})\b/.exec(cleaned);
    const variable =
      varMatch && varMatch[1] && varMatch[2]
        ? { min: parseInt(varMatch[1], 10), max: parseInt(varMatch[2], 10) }
        : undefined;

    let display = '';
    if (isCalm) {
      display = 'Sakin (Calm)';
    } else {
      const dirStr =
        direction === 'VRB' ? 'VRB' : `${String(direction).padStart(3, '0')}°`;
      const gustStr = gustKt ? ` G${gustKt}` : '';
      display = `${dirStr} ${speedKt}${gustStr} KT`;
      if (variable) {
        display += ` (${variable.min}°-${variable.max}°)`;
      }
    }

    wind = {
      direction,
      speedKt,
      gustKt,
      variable,
      isCalm,
      display,
    };
  }

  // 4. Görüş & CAVOK
  const isCavok = /\bCAVOK\b/.test(cleaned);
  let visibility: MetarData['visibility'] | undefined;
  let visMeters: number | undefined;

  if (isCavok) {
    visMeters = 10000;
    visibility = {
      meters: 10000,
      isCavok: true,
      display: 'CAVOK (≥ 10 km)',
    };
  } else {
    // 9999 veya 4 haneli metre (örn. 4000, 0800)
    const visMatch = /(?:^|\s)(9999|\d{4})\b(?!\s*Z|\s*KT)/.exec(cleaned);
    if (visMatch && visMatch[1]) {
      visMeters = parseInt(visMatch[1], 10);
      if (visMeters === 9999) {
        visibility = {
          meters: 10000,
          isCavok: false,
          display: '≥ 10 km (9999)',
        };
      } else {
        visibility = {
          meters: visMeters,
          isCavok: false,
          display: `${visMeters.toLocaleString('tr-TR')} m`,
        };
      }
    }
  }

  // 5. Bulutlar & Tavan (Ceiling)
  // Tavan: Yalnızca BKN (Broken 5-7/8) veya OVC (Overcast 8/8) veya VV (Dikey Görüş)
  const clouds: CloudLayer[] = [];
  const cloudRegex = /\b(FEW|SCT|BKN|OVC|VV)(\d{3})(CB|TCU)?\b/g;
  let match: RegExpExecArray | null;
  let lowestCeiling: number | null = null;

  const COVER_NAMES: Record<string, string> = {
    FEW: 'Az Bulutlu (1-2/8)',
    SCT: 'Parçalı (3-4/8)',
    BKN: 'Çok Bulutlu (5-7/8)',
    OVC: 'Kapalı (8/8)',
    VV: 'Dikey Görüş',
    SKC: 'Açık',
    CLR: 'Açık',
    NSC: 'Önemli Bulut Yok',
  };

  while ((match = cloudRegex.exec(cleaned)) !== null) {
    if (!match[1] || !match[2]) continue;
    const cover = match[1] as CloudLayer['cover'];
    const altitudeFt = parseInt(match[2], 10) * 100;
    const type = match[3] as CloudLayer['type'];

    clouds.push({
      cover,
      coverLabelTr: COVER_NAMES[cover] || cover,
      altitudeFt,
      type,
    });

    if (cover === 'BKN' || cover === 'OVC' || cover === 'VV') {
      if (lowestCeiling === null || altitudeFt < lowestCeiling) {
        lowestCeiling = altitudeFt;
      }
    }
  }

  if (isCavok || /\b(SKC|CLR|NSC)\b/.test(cleaned)) {
    if (clouds.length === 0) {
      const code = isCavok ? 'CAVOK' : (/\b(SKC|CLR|NSC)\b/.exec(cleaned)?.[1] || 'SKC');
      clouds.push({
        cover: code === 'CAVOK' ? 'CLR' : (code as CloudLayer['cover']),
        coverLabelTr: code === 'CAVOK' ? 'CAVOK (Tavan Yok)' : COVER_NAMES[code] || 'Açık',
      });
    }
  }

  // 6. Sıcaklık ve İşba (örn. 16/11, M02/M05)
  const tempMatch = /\b(M?\d{2})\/(M?\d{2})\b/.exec(cleaned);
  let temperature: MetarData['temperature'] | undefined;
  if (tempMatch && tempMatch[1] && tempMatch[2]) {
    const parseTemp = (s: string) =>
      s.startsWith('M') ? -parseInt(s.slice(1), 10) : parseInt(s, 10);
    temperature = {
      celsius: parseTemp(tempMatch[1]),
      dewpointCelsius: parseTemp(tempMatch[2]),
    };
  }

  // 7. Altimetre / QNH (örn. Q1018, A2992)
  const qnhMatch = /\b(Q\d{4}|A\d{4})\b/.exec(cleaned);
  let altimeter: MetarData['altimeter'] | undefined;
  if (qnhMatch && qnhMatch[1]) {
    const val = qnhMatch[1];
    if (val.startsWith('Q')) {
      const hPa = parseInt(val.slice(1), 10);
      altimeter = {
        hPa,
        display: `${hPa} hPa (${val})`,
      };
    } else if (val.startsWith('A')) {
      const inHg = parseInt(val.slice(1), 10) / 100;
      const hPa = Math.round(inHg * 33.8639);
      altimeter = {
        hPa,
        inHg,
        display: `${hPa} hPa (${inHg.toFixed(2)} inHg)`,
      };
    }
  }

  // 8. Hava Olayları (Weather Phenomena: -RA, +TSRA, FG, BR vb.)
  const weather: MetarData['weather'] = [];
  const wxRegex =
    /(?:^|\s)([-+]|VC)?(TS|SH|FZ|BL|DR|BC|PR)?(DZ|RA|SN|SG|IC|PL|GR|GS|UP|BR|FG|FU|VA|DU|SA|HZ|SQ)+(?=\s|$)/g;
  let wxMatch: RegExpExecArray | null;
  while ((wxMatch = wxRegex.exec(cleaned)) !== null) {
    const code = wxMatch[0].trim();
    if (code) {
      const desc = WEATHER_TRANSLATIONS[code] || code;
      weather.push({ code, descriptionTr: desc });
    }
  }

  // 9. Trend (NOSIG, BECMG, TEMPO)
  let trend: string | undefined;
  if (/\bNOSIG\b/.test(cleaned)) {
    trend = 'NOSIG (Önemli değişiklik beklenmiyor)';
  } else if (/\bTEMPO\b/.test(cleaned)) {
    trend = 'TEMPO (Geçici hava değişikliği)';
  } else if (/\bBECMG\b/.test(cleaned)) {
    trend = 'BECMG (Kademeli değişim)';
  }

  // 10. Uçuş Kategorisi Hesapla
  const category = calculateFlightCategory(visMeters, lowestCeiling, isCavok);
  const flightCategory = getFlightCategoryMeta(category);

  return {
    raw: cleaned,
    station,
    airportName: airportInfo.name,
    iata: airportInfo.iata,
    time,
    wind,
    visibility,
    weather: weather.length > 0 ? weather : undefined,
    clouds: clouds.length > 0 ? clouds : undefined,
    ceilingFt: lowestCeiling,
    temperature,
    altimeter,
    trend,
    flightCategory,
    fetchedAt: Date.now(),
  };
}
