import { z } from 'zod';
import {
  AI_SUBCATEGORIES,
  CATEGORY_KEYS,
  COMMERCIAL_SUBCATEGORIES,
  CONFIDENCE_LEVELS,
  FLIGHT_PHASES,
  INVESTIGATION_STATUSES,
  OCCURRENCE_CLASSES,
  PILOTING_SUBCATEGORIES,
  REGULATORS,
  SCHEMA_VERSION,
  type Importance,
} from './briefing.types';

// ---------- Ortak enum ve temel tipler ----------
export const categoryKeyZod = z.enum(CATEGORY_KEYS);
export const confidenceZod = z.enum(CONFIDENCE_LEVELS);
export const importanceZod = z
  .number()
  .int()
  .min(1)
  .max(5)
  .refine((n): n is Importance => n >= 1 && n <= 5);

export const commercialSubcategoryZod = z.enum(COMMERCIAL_SUBCATEGORIES);
export const occurrenceClassZod = z.enum(OCCURRENCE_CLASSES);
export const flightPhaseZod = z.enum(FLIGHT_PHASES);
export const investigationStatusZod = z.enum(INVESTIGATION_STATUSES);
export const pilotingSubcategoryZod = z.enum(PILOTING_SUBCATEGORIES);
export const regulatorZod = z.enum(REGULATORS);
export const aiSubcategoryZod = z.enum(AI_SUBCATEGORIES);

// ---------- Katman 1: LLM Çıktısı ----------
const llmBaseProps = {
  headline: z.string().min(1).max(140),
  summary: z.string().min(1).max(600),
  why_it_matters: z.string().min(1).max(300),
  importance: importanceZod,
  confidence: confidenceZod,
  tags: z.array(z.string().min(1)).max(5),
  source_ids: z
    .array(z.string().regex(/^[RG]\d{1,3}$/))
    .min(1)
    .max(4),
};

export const llmItemBaseZod = z.object(llmBaseProps);

export const llmCommercialItemZod = z.object({
  ...llmBaseProps,
  subcategory: commercialSubcategoryZod,
  entities: z.array(z.string().min(1)).max(6),
});

export const llmAccidentItemZod = z.object({
  ...llmBaseProps,
  occurrence_class: occurrenceClassZod,
  occurred_at_utc: z.string().nullable(),
  location: z.string().min(1),
  aircraft_type: z.string().min(1),
  registration: z.string().nullable(),
  operator: z.string().nullable(),
  flight_number: z.string().nullable(),
  flight_phase: flightPhaseZod,
  occupants: z.number().int().nonnegative().nullable(),
  fatalities: z.number().int().nonnegative().nullable(),
  injuries: z.number().int().nonnegative().nullable(),
  technical_findings: z.array(z.string()).max(5),
  operational_findings: z.array(z.string()).max(5),
  investigation_status: investigationStatusZod,
  investigating_authority: z.string().nullable(),
});

export const llmPilotingItemZod = z.object({
  ...llmBaseProps,
  subcategory: pilotingSubcategoryZod,
  regulators: z.array(regulatorZod).min(1).max(3),
  operational_takeaway: z.string().min(1),
});

export const llmAiItemZod = z.object({
  ...llmBaseProps,
  subcategory: aiSubcategoryZod,
  entities: z.array(z.string().min(1)).max(6),
  developer_impact: z.string().min(1),
});

export const llmBriefingZod = z.object({
  headline: z.string().min(1).max(140),
  tldr: z.array(z.string().min(1).max(160)).min(3).max(5),
  categories: z.object({
    commercial_aviation: z.array(llmCommercialItemZod).max(8),
    accidents_and_incidents: z.array(llmAccidentItemZod).max(10),
    piloting_and_ops: z.array(llmPilotingItemZod).max(8),
    ai_developments: z.array(llmAiItemZod).max(8),
  }),
});

// ---------- Katman 2: Yayınlanan Rapor (Briefing) ----------
export const sourceRefZod = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  published_at: z.string().nullable(),
  origin: z.enum(['rss', 'grounding']),
});

const publishedExtraProps = {
  id: z.string().regex(/^[0-9a-f]{10}$/),
  sources: z.array(sourceRefZod).min(1),
};

const { source_ids: _omittedSourceIds, ...publishedBaseProps } = llmBaseProps;

export const commercialItemZod = z.object({
  ...publishedBaseProps,
  subcategory: commercialSubcategoryZod,
  entities: z.array(z.string().min(1)).max(6),
  ...publishedExtraProps,
});

export const accidentItemZod = z.object({
  ...publishedBaseProps,
  occurrence_class: occurrenceClassZod,
  occurred_at_utc: z.string().nullable(),
  location: z.string().min(1),
  aircraft_type: z.string().min(1),
  registration: z.string().nullable(),
  operator: z.string().nullable(),
  flight_number: z.string().nullable(),
  flight_phase: flightPhaseZod,
  occupants: z.number().int().nonnegative().nullable(),
  fatalities: z.number().int().nonnegative().nullable(),
  injuries: z.number().int().nonnegative().nullable(),
  technical_findings: z.array(z.string()).max(5),
  operational_findings: z.array(z.string()).max(5),
  investigation_status: investigationStatusZod,
  investigating_authority: z.string().nullable(),
  ...publishedExtraProps,
});

export const pilotingItemZod = z.object({
  ...publishedBaseProps,
  subcategory: pilotingSubcategoryZod,
  regulators: z.array(regulatorZod).min(1).max(3),
  operational_takeaway: z.string().min(1),
  ...publishedExtraProps,
});

export const aiItemZod = z.object({
  ...publishedBaseProps,
  subcategory: aiSubcategoryZod,
  entities: z.array(z.string().min(1)).max(6),
  developer_impact: z.string().min(1),
  ...publishedExtraProps,
});

export const pipelineMetaZod = z.object({
  rss_feeds_ok: z.number().int().nonnegative(),
  rss_feeds_failed: z.array(z.string()),
  rss_items_fetched: z.number().int().nonnegative(),
  rss_items_used: z.number().int().nonnegative(),
  grounding_used: z.boolean(),
  grounding_queries: z.array(z.string()),
  dropped_items_no_source: z.number().int().nonnegative(),
  duration_ms: z.number().int().nonnegative(),
});

export const briefingZod = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  generated_at: z.string().min(1),
  window: z.object({
    from: z.string().min(1),
    to: z.string().min(1),
  }),
  model: z.string().min(1),
  headline: z.string().min(1).max(140),
  tldr: z.array(z.string().min(1).max(160)).min(3).max(5),
  categories: z.object({
    commercial_aviation: z.array(commercialItemZod),
    accidents_and_incidents: z.array(accidentItemZod),
    piloting_and_ops: z.array(pilotingItemZod),
    ai_developments: z.array(aiItemZod),
  }),
  warnings: z.array(z.string()),
  meta: pipelineMetaZod,
});

// ---------- Katman 3: Manifest ----------
export const manifestEntryZod = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  path: z.string().min(1),
  headline: z.string().min(1),
  counts: z.object({
    commercial_aviation: z.number().int().nonnegative(),
    accidents_and_incidents: z.number().int().nonnegative(),
    piloting_and_ops: z.number().int().nonnegative(),
    ai_developments: z.number().int().nonnegative(),
  }),
  has_fatal_accident: z.boolean(),
  max_importance: importanceZod,
  generated_at: z.string().min(1),
});

export const manifestZod = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  updated_at: z.string().min(1),
  latest: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  briefings: z.array(manifestEntryZod),
});
