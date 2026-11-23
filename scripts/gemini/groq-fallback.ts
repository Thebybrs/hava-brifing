// scripts/gemini/groq-fallback.ts — İsteğe bağlı Groq OpenAI-uyumlu JSON yedek üretici

import type { LlmBriefing } from '@shared/briefing.types';
import { llmBriefingZod } from '@shared/briefing.zod';
import { logger } from '../lib/logger';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

const GROQ_SCHEMA_REMINDER = `

JSON ŞEMA HATIRLATMASI (TÜM ALANLAR ZORUNLU):
Üst seviye alanlar: "headline" (≤140 karakter), "tldr" (3-5 madde, her biri ≤160 karakter), "categories": {
  "commercial_aviation": [{ headline, summary, why_it_matters, importance (1-5), confidence ("confirmed"|"preliminary"|"unverified"), tags, source_ids (["R001"]), subcategory ("airline_fleet"|"airbus"|"boeing"|"other_oem"|"airports_atc"|"market_finance"|"route_network"|"cargo_mro"), entities }],
  "accidents_and_incidents": [{ headline, summary, why_it_matters, importance (1-5), confidence, tags, source_ids, occurrence_class ("accident"|"serious_incident"|"incident"|"ground_event"|"unknown"), occurred_at_utc (string|null), location, aircraft_type, registration (string|null), operator (string|null), flight_number (string|null), flight_phase ("standing"|"pushback_taxi"|"takeoff_roll"|"initial_climb"|"climb"|"cruise"|"descent"|"approach"|"landing"|"go_around"|"unknown"), occupants (int|null), fatalities (int|null), injuries (int|null), technical_findings ([]), operational_findings ([]), investigation_status ("not_started"|"ongoing"|"preliminary_report_released"|"final_report_released"|"unknown"), investigating_authority (string|null) }],
  "piloting_and_ops": [{ headline, summary, why_it_matters, importance (1-5), confidence, tags, source_ids, subcategory ("sop_procedures"|"training_crm"|"regulation"|"safety_alert"|"human_factors"|"avionics_technology"), regulators (["EASA"|"FAA"|"SHGM"|"ICAO"|"UK_CAA"|"Other"|"None"]), operational_takeaway }],
  "ai_developments": [{ headline, summary, why_it_matters, importance (1-5), confidence, tags, source_ids, subcategory ("foundation_model"|"dev_tools"|"research"|"open_source"|"infrastructure_chips"|"policy_safety"|"product_launch"), entities, developer_impact }]
}`;

interface GroqChatResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

/**
 * Gemini tamamen erişilemez olduğunda ve GROQ_API_KEY tanımlıysa,
 * Groq API üzerinden OpenAI-uyumlu JSON modunda günlük brifing üretir.
 */
export async function runGroqStructuredFallback(input: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
}): Promise<LlmBriefing> {
  const startedAt = Date.now();
  const res = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    signal: AbortSignal.timeout(45_000),
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: input.model,
      messages: [
        { role: 'system', content: `${input.systemPrompt}${GROQ_SCHEMA_REMINDER}` },
        { role: 'user', content: input.userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 6144,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Groq API HTTP ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as GroqChatResponse;
  const rawContent = data.choices?.[0]?.message?.content?.trim();
  if (!rawContent) {
    throw new Error('Groq API boş JSON içeriği döndürdü.');
  }

  const parsedJson: unknown = JSON.parse(rawContent);
  const validated = llmBriefingZod.parse(parsedJson);

  logger.info('Groq yedek Stage B tamamlandı', {
    model: input.model,
    durationMs: Date.now() - startedAt,
  });

  return validated;
}
