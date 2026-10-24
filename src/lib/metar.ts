// src/lib/metar.ts — Havacılık METAR çözücü (Decoder), canlı çekici ve EFB kokpit analiz motoru

import type { CloudLayer, FlightCategory, MetarData, WindData } from '@/types/metar';

export type { FlightCategory };

export interface DecodedMetar extends MetarData {
  stationName: string;
  observedAtUtc: string; // ISO UTC
  timeFormatted: string; // "18:20Z"
  windDirectionDeg: number | 'VRB' | null;
  windSpeedKt: number | null;
  windGustKt: number | null;
  windSummary: string; // "040° yönünden 12 knot"
  visibilityMeters: number | null;
  visibilitySummary: string; // "10 km ve üzeri (CAVOK)"
  ceilingFeet: number | null; // BKN veya OVC en düşük taban
  cloudSummary: string; // "3000 ft az bulutlu (FEW)"
  temperatureC: number | null;
  dewpointC: number | null;
  qnhHpa: number | null;
  qnhSummary: string; // "1022 hPa (Yüksek basınç)"
  category: FlightCategory;
  categoryLabel: string; // "VFR (Görerek Uçuş)"
  weatherPhenomena: string[];
  takeaway: string; // Aday pilot için operasyonel mülakat notu
}

export const AIRFIELD_PRESETS: Record<string, { code: string; name: string; city: string; iata?: string }> = {
  LTFM: { code: 'LTFM', name: 'İstanbul Havalimanı (THY Ana Üssü)', city: 'İstanbul', iata: 'IST' },
  LTFJ: { code: 'LTFJ', name: 'Sabiha Gökçen Havalimanı', city: 'İstanbul', iata: 'SAW' },
  LTAI: { code: 'LTAI', name: 'Antalya Havalimanı', city: 'Antalya', iata: 'AYT' },
  LTAC: { code: 'LTAC', name: 'Esenboğa Havalimanı', city: 'Ankara', iata: 'ESB' },
  LTBA: { code: 'LTBA', name: 'Atatürk Havalimanı', city: 'İstanbul', iata: 'ISL' },
  LTBJ: { code: 'LTBJ', name: 'İzmir Adnan Menderes Havalimanı', city: 'İzmir', iata: 'ADB' },
};

export const FALLBACK_METARS: Record<string, string> = {
  LTFM: 'LTFM 241820Z 04012KT 9999 FEW030 14/08 Q1022 NOSIG',
  LTFJ: 'LTFJ 241820Z 03010KT 9999 SCT035 15/09 Q1022 NOSIG',
  LTAI: 'LTAI 241820Z 34006KT CAVOK 19/11 Q1019 NOSIG',
  LTAC: 'LTAC 241820Z 02008KT CAVOK 11/04 Q1025 NOSIG',
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
 * Ham METAR metnini ayrıştırarak yapılandırılmış DecodedMetar (ve MetarData) nesnesine çevirir.
 */
export function parseMetar(rawMetar: string, stationCode?: string): DecodedMetar {
  const cleaned = rawMetar.trim().replace(/\s+/g, ' ');
  const tokens = cleaned.split(' ');

  // 1. İstasyon Kodu (LTFM, LTBA vb.)
  const stationMatch = /(?:^|\s)(?:METAR|SPECI)?\s*([A-Z]{4})\b/.exec(cleaned);
  const station = stationCode || stationMatch?.[1] || tokens[0] || 'LTFM';
  const stationMeta = AIRFIELD_PRESETS[station] ?? {
    code: station,
    name: `${station} Havalimanı`,
    city: '',
    iata: '',
  };

  // 2. Zaman (örn. 241450Z -> 24'ü 14:50 UTC)
  const timeMatch = /\b(\d{2})(\d{2})(\d{2})Z\b/.exec(cleaned);
  let time: MetarData['time'] | undefined;
  let observedAtUtc = new Date().toISOString();
  let timeFormatted = '—';

  if (timeMatch && timeMatch[1] && timeMatch[2] && timeMatch[3]) {
    const day = parseInt(timeMatch[1], 10);
    const hour = parseInt(timeMatch[2], 10);
    const minute = parseInt(timeMatch[3], 10);

    const now = new Date();
    const utcDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, hour, minute),
    );
    observedAtUtc = utcDate.toISOString();

    const trtHour = (hour + 3) % 24;
    const trtFormatted = `${String(trtHour).padStart(2, '0')}:${String(minute).padStart(2, '0')} TRT`;
    timeFormatted = `${timeMatch[2]}:${timeMatch[3]}Z`;

    time = {
      day,
      hour,
      minute,
      zulu: timeFormatted,
      trtFormatted,
      isoDate: utcDate.toISOString(),
    };
  }

  // 3. Rüzgar (örn. 06009KT, 06015G25KT, VRB02KT, 00000KT)
  let wind: WindData | undefined;
  let windDirectionDeg: number | 'VRB' | null = null;
  let windSpeedKt: number | null = null;
  let windGustKt: number | null = null;
  let windSummary = 'Rüzgar sakin / belirtilmemiş';

  const windMatch = /\b(VRB|\d{3})(\d{2,3})(?:G(\d{2,3}))?KT\b/.exec(cleaned);
  if (windMatch && windMatch[1] && windMatch[2]) {
    const isVrb = windMatch[1] === 'VRB';
    const direction = isVrb ? 'VRB' : parseInt(windMatch[1], 10);
    const speed = parseInt(windMatch[2], 10);
    const gust = windMatch[3] ? parseInt(windMatch[3], 10) : undefined;
    const isCalm = !isVrb && direction === 0 && speed === 0;

    windDirectionDeg = direction;
    windSpeedKt = speed;
    windGustKt = gust ?? null;

    let display = '';
    if (isCalm) {
      display = 'Sakin (Calm)';
      windSummary = 'Rüzgar Sakin (Calm 00000KT)';
    } else if (isVrb) {
      display = `VRB / ${speed} kt${gust ? ` (Hamle ${gust} kt)` : ''}`;
      windSummary = `Değişken (VRB) ${speed} kt${gust ? ` (Hamle: ${gust} kt)` : ''}`;
    } else {
      display = `${String(direction).padStart(3, '0')}° / ${speed} kt${
        gust ? ` (Hamle ${gust} kt)` : ''
      }`;
      windSummary = `${String(direction).padStart(3, '0')}° yönünden ${speed} kt${
        gust ? ` (Hamle: ${gust} kt)` : ''
      }`;
    }

    // Değişken rüzgar aralığı kontrolü (örn. 020V080)
    let variable: { min: number; max: number } | undefined;
    const varMatch = /\b(\d{3})V(\d{3})\b/.exec(cleaned);
    if (varMatch && varMatch[1] && varMatch[2]) {
      variable = {
        min: parseInt(varMatch[1], 10),
        max: parseInt(varMatch[2], 10),
      };
      display += ` (${varMatch[1]}°-${varMatch[2]}°)`;
      windSummary += ` (${varMatch[1]}° ile ${varMatch[2]}° arasında değişken)`;
    }

    wind = {
      direction,
      speedKt: speed,
      gustKt: gust,
      variable,
      isCalm,
      display,
    };
  }

  // 4. Görüş & CAVOK
  const isCavok = /\bCAVOK\b/.test(cleaned);
  let visibility: MetarData['visibility'] | undefined;
  let visibilityMeters: number | null = null;
  let visibilitySummary = 'Görüş belirtilmemiş';

  if (isCavok) {
    visibilityMeters = 10000;
    visibilitySummary = 'CAVOK (10 km+ görüş, 5000 ft altında bulut yok)';
    visibility = {
      meters: 10000,
      isCavok: true,
      display: 'CAVOK (≥ 10 km)',
    };
  } else {
    const visMatch = /(?:^|\s)(9999|\d{4})\b(?!\s*Z|\s*KT)/.exec(cleaned);
    if (visMatch && visMatch[1]) {
      const v = parseInt(visMatch[1], 10);
      visibilityMeters = v;
      if (v >= 9999) {
        visibilitySummary = '10 km ve üzeri (9999)';
        visibility = {
          meters: 10000,
          isCavok: false,
          display: '≥ 10 km (9999)',
        };
      } else {
        visibilitySummary = `${v} metre`;
        visibility = {
          meters: v,
          isCavok: false,
          display: `${v.toLocaleString('tr-TR')} m`,
        };
      }
    }
  }

  // 5. Bulutlar & Tavan (Ceiling)
  const clouds: CloudLayer[] = [];
  const cloudRegex = /\b(FEW|SCT|BKN|OVC|VV)(\d{3})(CB|TCU)?\b/g;
  let match: RegExpExecArray | null;
  let lowestCeiling: number | null = null;

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

  // Bulut özeti
  let cloudSummary = 'Açık / Belirgin bulut yok';
  if (isCavok) {
    cloudSummary = 'CAVOK (Operasyonel Tavan Açık)';
  } else if (clouds.length > 0) {
    cloudSummary = clouds
      .map((c) => {
        const coverTr =
          c.cover === 'FEW' ? 'Az (FEW)' : c.cover === 'SCT' ? 'Parçalı (SCT)' : c.cover === 'BKN' ? 'Kırık/Çok (BKN)' : 'Kapalı (OVC)';
        return `${c.altitudeFt ?? 0} ft ${coverTr}`;
      })
      .join(', ');
  }

  // 6. Sıcaklık ve İşba (örn. 16/11, M02/M05, 14/08)
  const tempMatch = /\b(M?\d{2})\/(M?\d{2})\b/.exec(cleaned);
  let temperature: MetarData['temperature'] | undefined;
  let temperatureC: number | null = null;
  let dewpointC: number | null = null;

  if (tempMatch && tempMatch[1] && tempMatch[2]) {
    const parseTemp = (s: string) =>
      s.startsWith('M') ? -parseInt(s.slice(1), 10) : parseInt(s, 10);
    temperatureC = parseTemp(tempMatch[1]);
    dewpointC = parseTemp(tempMatch[2]);
    temperature = {
      celsius: temperatureC,
      dewpointCelsius: dewpointC,
    };
  }

  // 7. Altimetre / QNH (örn. Q1018, A2992, Q1022)
  const qnhMatch = /\b(Q\d{4}|A\d{4})\b/.exec(cleaned);
  let altimeter: MetarData['altimeter'] | undefined;
  let qnhHpa: number | null = null;
  let qnhSummary = '—';

  if (qnhMatch && qnhMatch[1]) {
    const val = qnhMatch[1];
    if (val.startsWith('Q')) {
      qnhHpa = parseInt(val.slice(1), 10);
      altimeter = {
        hPa: qnhHpa,
        display: `${qnhHpa} hPa (${val})`,
      };
      const diff = qnhHpa - 1013;
      if (diff > 0) {
        qnhSummary = `${qnhHpa} hPa (Standart +${diff} hPa, Yüksek Basınç)`;
      } else if (diff < 0) {
        qnhSummary = `${qnhHpa} hPa (Standart ${diff} hPa, Alçak Basınç)`;
      } else {
        qnhSummary = '1013 hPa (Standart Atmosfer Basıncı)';
      }
    } else if (val.startsWith('A')) {
      const inHg = parseInt(val.slice(1), 10) / 100;
      qnhHpa = Math.round(inHg * 33.8639);
      altimeter = {
        hPa: qnhHpa,
        inHg,
        display: `${qnhHpa} hPa (${inHg.toFixed(2)} inHg)`,
      };
      qnhSummary = `${qnhHpa} hPa (${inHg.toFixed(2)} inHg)`;
    }
  }

  // 8. Hava Olayları (Weather Phenomena: -RA, +TSRA, FG, BR vb.)
  const weather: MetarData['weather'] = [];
  const weatherPhenomena: string[] = [];
  const wxRegex =
    /(?:^|\s)([-+]|VC)?(TS|SH|FZ|BL|DR|BC|PR)?(DZ|RA|SN|SG|IC|PL|GR|GS|UP|BR|FG|FU|VA|DU|SA|HZ|SQ)+(?=\s|$)/g;
  let wxMatch: RegExpExecArray | null;
  while ((wxMatch = wxRegex.exec(cleaned)) !== null) {
    const code = wxMatch[0].trim();
    if (code) {
      const desc = WEATHER_TRANSLATIONS[code] || code;
      weather.push({ code, descriptionTr: desc });
      weatherPhenomena.push(desc);
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
  const category = calculateFlightCategory(visibilityMeters ?? undefined, lowestCeiling, isCavok);
  const flightCategory = getFlightCategoryMeta(category);

  let categoryLabel = 'VFR (Görerek Uçuş Kuralları)';
  if (category === 'LIFR') {
    categoryLabel = 'LIFR (Düşük Aletli Uçuş — Yoğun Sis/Düşük Tavan)';
  } else if (category === 'IFR') {
    categoryLabel = 'IFR (Aletli Uçuş Kuralları Zorunlu)';
  } else if (category === 'MVFR') {
    categoryLabel = 'MVFR (Marjinal VFR — Dikkatli Yaklaşma)';
  }

  // 11. Aday Pilot İçin Mülakat/Operasyonel Notu
  let takeaway = '';
  if (qnhHpa && qnhHpa > 1013) {
    takeaway = `Altimetreye QNH ${qnhHpa} hPa bağlandığında uçak pist rakımını tam gösterir. Yüksek basınçta hava yoğunluğu artar; uçak motor performansı ve tırmanış açısı olumlu etkilenir.`;
  } else if (qnhHpa && qnhHpa < 1013) {
    takeaway = `Alçak basınç (QNH ${qnhHpa}) altimetre ayarında yoğunluk irtifası (density altitude) artar; motor itkisi ve kanat kaldırma kuvveti azalır, kalkış/iniş mesafesi uzar.`;
  } else if (windSpeedKt && windSpeedKt >= 15) {
    takeaway = `Rüzgar ${windSpeedKt} kt seviyesinde. Yaklaşma brifinginde rüzgar yönüne göre baş rüzgar ve yan rüzgar (crosswind) bileşenini hesaplayarak pist seçimini teyit edin.`;
  } else {
    takeaway = `Meydan genelinde VFR/açık koşullar hakim. Yaklaşma brifinginde standart aletli yaklaşma (ILS/RNAV) profiline ve stabil yaklaşma kriterlerine (1000 ft AAL) sadık kalın.`;
  }

  return {
    raw: cleaned,
    station,
    airportName: stationMeta.name,
    stationName: stationMeta.name,
    iata: stationMeta.iata,
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
    // Cadet / EFB Genişletilmiş Alanlar
    observedAtUtc,
    timeFormatted,
    windDirectionDeg,
    windSpeedKt,
    windGustKt,
    windSummary,
    visibilityMeters,
    visibilitySummary,
    ceilingFeet: lowestCeiling,
    cloudSummary,
    temperatureC,
    dewpointC,
    qnhHpa,
    qnhSummary,
    category,
    categoryLabel,
    weatherPhenomena,
    takeaway,
  };
}

/**
 * NOAA Aviation Weather API'den ham METAR çeker.
 * CORS veya ağ hatası olursa yerleşik son geçerli METAR'ı döner.
 */
export async function fetchLiveMetar(station: string): Promise<DecodedMetar> {
  const code = station.toUpperCase();
  const url = `https://aviationweather.gov/api/data/metar?ids=${code}&format=raw`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'text/plain' },
    });
    clearTimeout(timer);

    if (res.ok) {
      const text = await res.text();
      const lines = text.trim().split('\n').filter((l) => l.trim().length > 0);
      if (lines[0]) {
        return parseMetar(lines[0], code);
      }
    }
  } catch {
    // Ağ/CORS hatası durumunda fallback
  }

  const fallback = FALLBACK_METARS[code] || FALLBACK_METARS.LTFM!;
  return parseMetar(fallback, code);
}
