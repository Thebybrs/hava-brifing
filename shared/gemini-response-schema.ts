// shared/gemini-response-schema.ts
import { Type, type Schema } from '@google/genai';
import {
  AI_SUBCATEGORIES, COMMERCIAL_SUBCATEGORIES, CONFIDENCE_LEVELS, FLIGHT_PHASES,
  INVESTIGATION_STATUSES, OCCURRENCE_CLASSES, PILOTING_SUBCATEGORIES, REGULATORS,
} from './briefing.types';

// ---------- helper'lar ----------
const str = (description: string): Schema => ({ type: Type.STRING, description });
const strNull = (description: string): Schema => ({ type: Type.STRING, description, nullable: true });
const intNull = (description: string): Schema => ({ type: Type.INTEGER, description, nullable: true });
const enumOf = (values: readonly string[], description: string): Schema => ({
  type: Type.STRING,
  description: `${description} (İzin verilen değerler: ${values.join(', ')})`,
});
const arr = (items: Schema, description: string): Schema => ({
  type: Type.ARRAY,
  items,
  description,
});
const obj = (
  properties: Record<string, Schema>,
  propertyOrdering: string[],
  required: string[] = propertyOrdering,
): Schema => ({ type: Type.OBJECT, properties, propertyOrdering, required });

// ---------- ortak alanlar ----------
const baseProps: Record<string, Schema> = {
  headline: str('Türkçe haber başlığı, en fazla 110 karakter, clickbait yok.'),
  summary: str('Türkçe olgusal özet, 2-4 cümle, en fazla 450 karakter. Teknik terimler İngilizce korunur.'),
  why_it_matters: str('Tek cümle: pilot/mühendis/geliştirici için neden önemli.'),
  importance: {
    type: Type.INTEGER,
    description: '1 ile 5 arası tam sayı (1=düşük, 3=orta, 5=kritik). Rubrik system prompt içinde.',
  },
  confidence: enumOf(CONFIDENCE_LEVELS, 'confirmed=resmi/çoklu güvenilir kaynak; preliminary=ilk raporlar; unverified=tek/zayıf kaynak.'),
  tags: arr(str('Kısa etiket'), '0-5 etiket'),
  source_ids: arr(str('Girdideki kaynak id\'si, örn. R014 veya G3'),
    'Yalnızca girdide bulunan id\'ler. En az 1 adet.'),
};
const baseOrder = ['headline', 'summary', 'why_it_matters', 'importance', 'confidence', 'tags', 'source_ids'];

// ---------- kategori öğe şemaları ----------
const commercialItem = obj(
  { ...baseProps,
    subcategory: enumOf(COMMERCIAL_SUBCATEGORIES, 'Alt kategori'),
    entities: arr(str('Havayolu/üretici/uçak tipi/havalimanı'), 'İlgili varlıklar') },
  [...baseOrder, 'subcategory', 'entities'],
);

const accidentItem = obj(
  { ...baseProps,
    occurrence_class: enumOf(OCCURRENCE_CLASSES, 'ICAO Annex 13 sınıfı; emin değilsen unknown.'),
    occurred_at_utc: strNull('ISO-8601 UTC, örn. 2026-10-23T04:15:00Z. Bilinmiyorsa null.'),
    location: str('Şehir/Havalimanı (ICAO kodu), Ülke'),
    aircraft_type: str('Örn. "Airbus A320-214". Bilinmiyorsa "Bilinmiyor".'),
    registration: strNull('Tescil/tail number BÜYÜK HARF. Metinde yoksa null; ASLA tahmin etme.'),
    operator: strNull('İşletmeci havayolu/operatör'),
    flight_number: strNull('Uçuş numarası'),
    flight_phase: enumOf(FLIGHT_PHASES, 'Olayın gerçekleştiği uçuş safhası'),
    occupants: intNull('Toplam kişi sayısı'),
    fatalities: intNull('Ölü sayısı; bilinmiyorsa null'),
    injuries: intNull('Yaralı sayısı; bilinmiyorsa null'),
    technical_findings: arr(str('Teknik bulgu/şüpheli arıza'), 'Metinde geçen teknik bulgular'),
    operational_findings: arr(str('Operasyonel bulgu'), 'Hava, pist, CRM, ATC, yaklaşma vb.'),
    investigation_status: enumOf(INVESTIGATION_STATUSES, 'Soruşturma durumu'),
    investigating_authority: strNull('NTSB, BEA, AAIB, UEAK vb.') },
  [...baseOrder, 'occurrence_class', 'occurred_at_utc', 'location', 'aircraft_type', 'registration',
   'operator', 'flight_number', 'flight_phase', 'occupants', 'fatalities', 'injuries',
   'technical_findings', 'operational_findings', 'investigation_status', 'investigating_authority'],
);

const pilotingItem = obj(
  { ...baseProps,
    subcategory: enumOf(PILOTING_SUBCATEGORIES, 'Alt kategori'),
    regulators: arr(enumOf(REGULATORS, 'Otorite'), 'İlgili otoriteler; yoksa ["None"]'),
    operational_takeaway: str('1-2 cümle: operasyonel/eğitsel çıkarım') },
  [...baseOrder, 'subcategory', 'regulators', 'operational_takeaway'],
);

const aiItem = obj(
  { ...baseProps,
    subcategory: enumOf(AI_SUBCATEGORIES, 'Alt kategori'),
    entities: arr(str('Şirket/model/araç'), 'İlgili varlıklar'),
    developer_impact: str('1-2 cümle: geliştirici için pratik etki') },
  [...baseOrder, 'subcategory', 'entities', 'developer_impact'],
);

// ---------- kök şema ----------
export const briefingResponseSchema: Schema = obj(
  {
    headline: str('Günün manşeti, Türkçe, en fazla 120 karakter.'),
    tldr: arr(str('Tek satır özet, en fazla 140 karakter'), '3-5 maddelik günün özeti'),
    categories: obj(
      {
        commercial_aviation: arr(commercialItem, 'Ticari havacılık haberleri'),
        accidents_and_incidents: arr(accidentItem, 'Son 24 saatteki kaza/kırım/ciddi arızalar'),
        piloting_and_ops: arr(pilotingItem, 'Pilotaj, SOP, eğitim, CRM, regülasyon'),
        ai_developments: arr(aiItem, 'Yapay zeka gelişmeleri'),
      },
      ['commercial_aviation', 'accidents_and_incidents', 'piloting_and_ops', 'ai_developments'],
    ),
  },
  ['headline', 'tldr', 'categories'],
);
