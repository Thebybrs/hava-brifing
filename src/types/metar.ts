// src/types/metar.ts — Havacılık METAR hava durumu veri tipleri

export type FlightCategory = 'VFR' | 'MVFR' | 'IFR' | 'LIFR';

export interface CloudLayer {
  cover: 'FEW' | 'SCT' | 'BKN' | 'OVC' | 'VV' | 'SKC' | 'CLR' | 'NSC';
  coverLabelTr: string;
  altitudeFt?: number;
  type?: 'CB' | 'TCU';
}

export interface WindData {
  direction: number | 'VRB';
  speedKt: number;
  gustKt?: number;
  variable?: { min: number; max: number };
  isCalm: boolean;
  display: string;
}

export interface MetarData {
  raw: string;
  station: string;
  airportName: string;
  iata?: string;
  time?: {
    day: number;
    hour: number;
    minute: number;
    zulu: string;
    trtFormatted: string;
    isoDate: string;
  };
  wind?: WindData;
  visibility?: {
    meters?: number;
    isCavok: boolean;
    display: string;
  };
  weather?: Array<{
    code: string;
    descriptionTr: string;
  }>;
  clouds?: CloudLayer[];
  ceilingFt?: number | null;
  temperature?: {
    celsius: number;
    dewpointCelsius?: number;
  };
  altimeter?: {
    hPa: number;
    inHg?: number;
    display: string;
  };
  trend?: string;
  flightCategory: {
    category: FlightCategory;
    nameTr: string;
    badgeClass: string;
    dotClass: string;
    textClass: string;
  };
  fetchedAt: number;
}
