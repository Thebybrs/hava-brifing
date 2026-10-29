// ============================================================
// shared/briefing.types.ts — TEK DOĞRULUK KAYNAĞI
// Enum dizileri hem tip hem Gemini schema hem zod için kullanılır.
// ============================================================

export const SCHEMA_VERSION = 1 as const;

// ---------- Ortak enum'lar ----------
export const CATEGORY_KEYS = [
  'commercial_aviation',
  'accidents_and_incidents',
  'piloting_and_ops',
  'ai_developments',
] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const CONFIDENCE_LEVELS = ['confirmed', 'preliminary', 'unverified'] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

/** 1 = düşük ilgi, 5 = kritik/herkes bilmeli */
export type Importance = 1 | 2 | 3 | 4 | 5;

// ---------- Kategori alt türleri ----------
export const COMMERCIAL_SUBCATEGORIES = [
  'airline_fleet',      // filo siparişi/teslimat/emeklilik
  'airbus',
  'boeing',
  'other_oem',          // Embraer, COMAC, ATR, motor üreticileri vb.
  'airports_atc',
  'market_finance',
  'route_network',
  'cargo_mro',
] as const;
export type CommercialSubcategory = (typeof COMMERCIAL_SUBCATEGORIES)[number];

export const OCCURRENCE_CLASSES = [
  'accident',           // ICAO Annex 13 tanımı: ölüm/ağır yaralanma/ciddi hasar
  'serious_incident',
  'incident',
  'ground_event',
  'unknown',
] as const;
export type OccurrenceClass = (typeof OCCURRENCE_CLASSES)[number];

/** ICAO CAST/ECCAIRS ile uyumlu sadeleştirilmiş uçuş safhaları */
export const FLIGHT_PHASES = [
  'standing',
  'pushback_taxi',
  'takeoff_roll',
  'initial_climb',
  'climb',
  'cruise',
  'descent',
  'approach',
  'landing',
  'go_around',
  'unknown',
] as const;
export type FlightPhase = (typeof FLIGHT_PHASES)[number];

export const INVESTIGATION_STATUSES = [
  'not_started',
  'ongoing',
  'preliminary_report_released',
  'final_report_released',
  'unknown',
] as const;
export type InvestigationStatus = (typeof INVESTIGATION_STATUSES)[number];

export const PILOTING_SUBCATEGORIES = [
  'sop_procedures',
  'training_crm',
  'regulation',
  'safety_alert',       // AD, SIB, EASA SIB, FAA SAFO/InFO
  'human_factors',
  'avionics_technology',
] as const;
export type PilotingSubcategory = (typeof PILOTING_SUBCATEGORIES)[number];

export const REGULATORS = ['EASA', 'FAA', 'SHGM', 'ICAO', 'UK_CAA', 'Other', 'None'] as const;
export type Regulator = (typeof REGULATORS)[number];

export const AI_SUBCATEGORIES = [
  'foundation_model',
  'dev_tools',
  'research',
  'open_source',
  'infrastructure_chips',
  'policy_safety',
  'product_launch',
] as const;
export type AiSubcategory = (typeof AI_SUBCATEGORIES)[number];

// ============================================================
// KATMAN 1 — LLM ÇIKTISI (Gemini responseSchema bunu zorlar)
// ============================================================
export interface LlmItemBase {
  /** Türkçe, ≤ 110 karakter, haber başlığı üslubu, clickbait yok */
  headline: string;
  /** Türkçe, 2–4 cümle, ≤ 450 karakter; olgusal özet */
  summary: string;
  /** Türkçe, 1 cümle: pilot/mühendis/geliştirici için neden önemli */
  why_it_matters: string;
  importance: Importance;
  confidence: Confidence;
  /** 0–5 adet kısa etiket (örn. "A320neo", "EASA", "RAG") */
  tags: string[];
  /** Girdideki kaynak id'leri: "R014", "G3". Boş OLAMAZ (min 1). Uydurma id yasak. */
  source_ids: string[];
}

export interface LlmCommercialItem extends LlmItemBase {
  subcategory: CommercialSubcategory;
  /** Havayolu / üretici / uçak tipi / havalimanı adları */
  entities: string[];
}

export interface LlmAccidentItem extends LlmItemBase {
  occurrence_class: OccurrenceClass;
  /** ISO-8601 UTC ("2026-10-23T04:15:00Z") veya bilinmiyorsa null */
  occurred_at_utc: string | null;
  /** "Şehir/Havalimanı (ICAO), Ülke" */
  location: string;
  /** "Airbus A320-214", "Boeing 737-800" — bilinmiyorsa "Bilinmiyor" */
  aircraft_type: string;
  /** Tescil / tail number, BÜYÜK HARF ("TC-JPA", "N123AB"); bilinmiyorsa null */
  registration: string | null;
  operator: string | null;
  flight_number: string | null;
  flight_phase: FlightPhase;
  occupants: number | null;
  fatalities: number | null;
  injuries: number | null;
  /** Teknik bulgular/şüpheli arızalar (ECAM mesajı, motor, hidrolik, gear...) — max 5 madde */
  technical_findings: string[];
  /** Operasyonel bulgular (hava durumu, pist, CRM, ATC, yaklaşma) — max 5 madde */
  operational_findings: string[];
  investigation_status: InvestigationStatus;
  /** "NTSB", "BEA", "AAIB", "UEAK" vb.; bilinmiyorsa null */
  investigating_authority: string | null;
}

export interface LlmPilotingItem extends LlmItemBase {
  subcategory: PilotingSubcategory;
  regulators: Regulator[];
  /** Bu haberden çıkarılacak operasyonel/eğitsel ders (1–2 cümle) */
  operational_takeaway: string;
}

export interface LlmAiItem extends LlmItemBase {
  subcategory: AiSubcategory;
  /** Şirket/model/araç adları ("GPT-5", "Claude", "Gemini 2.5", "LangGraph") */
  entities: string[];
  /** Yazılım geliştirici için pratik etki (1–2 cümle) */
  developer_impact: string;
}

export interface LlmBriefing {
  /** Günün manşeti, Türkçe, ≤ 120 karakter */
  headline: string;
  /** 3–5 madde, her biri ≤ 140 karakter; bildirim metninde kullanılır */
  tldr: string[];
  categories: {
    commercial_aviation: LlmCommercialItem[];       // 0–8
    accidents_and_incidents: LlmAccidentItem[];     // 0–10
    piloting_and_ops: LlmPilotingItem[];            // 0–8
    ai_developments: LlmAiItem[];                   // 0–8
  };
}

// ============================================================
// KATMAN 2 — YAYINLANAN RAPOR (frontend'in okuduğu)
// ============================================================
export interface SourceRef {
  name: string;                 // "The Aviation Herald"
  url: string;                  // https://...
  published_at: string | null;  // ISO UTC
  origin: 'rss' | 'grounding';
}

/** LLM öğesinden `source_ids` çıkar, `id` + `sources` ekle */
export type Published<T extends LlmItemBase> = Omit<T, 'source_ids'> & {
  /** Deterministik: sha1(headline + ilk kaynak url).slice(0, 10) */
  id: string;
  sources: SourceRef[];
};

export type CommercialItem = Published<LlmCommercialItem>;
export type AccidentItem = Published<LlmAccidentItem>;
export type PilotingItem = Published<LlmPilotingItem>;
export type AiItem = Published<LlmAiItem>;

export interface PipelineMeta {
  rss_feeds_ok: number;
  rss_feeds_failed: string[];       // feed id'leri
  rss_items_fetched: number;
  rss_items_used: number;           // filtre sonrası prompta giren
  grounding_used: boolean;
  grounding_queries: string[];      // groundingMetadata.webSearchQueries
  dropped_items_no_source: number;  // kaynağı çözülemeyip atılan
  duration_ms: number;
}

export interface Briefing {
  schema_version: typeof SCHEMA_VERSION;
  /** TRT takvim günü: "2026-10-23" */
  date: string;
  generated_at: string;             // ISO UTC
  window: { from: string; to: string }; // ISO UTC, 24 saat
  model: string;                    // "gemini-3.5-flash"
  headline: string;
  tldr: string[];
  categories: {
    commercial_aviation: CommercialItem[];
    accidents_and_incidents: AccidentItem[];
    piloting_and_ops: PilotingItem[];
    ai_developments: AiItem[];
  };
  warnings: string[];               // "FlightGlobal RSS alınamadı" vb.
  meta: PipelineMeta;
}

// ============================================================
// KATMAN 3 — MANİFEST (public/data/briefings/index.json)
// ============================================================
export interface ManifestEntry {
  date: string;                     // "2026-10-23"
  path: string;                     // "2026-10-23.json" (index.json'a göre göreli)
  headline: string;
  counts: Record<CategoryKey, number>;
  has_fatal_accident: boolean;
  max_importance: Importance;
  generated_at: string;
}

export interface BriefingManifest {
  schema_version: typeof SCHEMA_VERSION;
  updated_at: string;               // ISO UTC
  latest: string | null;            // en yeni date
  briefings: ManifestEntry[];       // date DESC sıralı, tarih başına tek kayıt
}
