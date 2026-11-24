// scripts/gemini/structured.ts — §4.3 ve §6.1 Stage B (responseSchema + düz-metin JSON yedeği) + zod doğrulama + repair retry

import { FinishReason } from '@google/genai';
import type { LlmBriefing } from '@shared/briefing.types';
import { llmBriefingZod } from '@shared/briefing.zod';
import { briefingResponseSchema } from '@shared/gemini-response-schema';
import { DEFAULT_LIMITS } from '@shared/constants';
import { logger } from '../lib/logger';
import { BRIEFING_SYSTEM_PROMPT } from '../prompts/briefing.system';
import { renderUserPrompt } from '../prompts/briefing.user';
import { generateWithRetry } from './client';

const PLAIN_JSON_SCHEMA_CONTRACT = `

KESİN JSON ŞEMA KONTRATI (YALNIZCA SAF JSON DÖNDÜR, MARKDOWN KOD BLOĞU EKLEME; TÜM headline, summary, why_it_matters ALANLARI TÜRKÇE OLMALIDIR):
{
  "headline": "string (≤140 karakter)",
  "tldr": ["string (3-5 madde, her biri ≤160 karakter)"],
  "categories": {
    "commercial_aviation": [{
      "headline": "string (≤140)",
      "summary": "string (≤600)",
      "why_it_matters": "string (≤300)",
      "importance": 1..5,
      "confidence": "confirmed" | "preliminary" | "unverified",
      "tags": ["string (max 5)"],
      "source_ids": ["R001" (1-4 adet, yalnızca girdideki id'ler)],
      "subcategory": "airline_fleet" | "airbus" | "boeing" | "other_oem" | "airports_atc" | "market_finance" | "route_network" | "cargo_mro",
      "entities": ["string (max 6)"]
    }],
    "accidents_and_incidents": [{
      "headline": "string (≤140)",
      "summary": "string (≤600)",
      "why_it_matters": "string (≤300)",
      "importance": 1..5,
      "confidence": "confirmed" | "preliminary" | "unverified",
      "tags": ["string (max 5)"],
      "source_ids": ["R001"],
      "occurrence_class": "accident" | "serious_incident" | "incident" | "ground_event" | "unknown",
      "occurred_at_utc": "ISO UTC string" | null,
      "location": "string (bilinmiyorsa 'Bilinmiyor')",
      "aircraft_type": "string (bilinmiyorsa 'Bilinmiyor')",
      "registration": "string" | null,
      "operator": "string" | null,
      "flight_number": "string" | null,
      "flight_phase": "standing" | "pushback_taxi" | "takeoff_roll" | "initial_climb" | "climb" | "cruise" | "descent" | "approach" | "landing" | "go_around" | "unknown",
      "occupants": int | null,
      "fatalities": int | null,
      "injuries": int | null,
      "technical_findings": ["string (max 5)"],
      "operational_findings": ["string (max 5)"],
      "investigation_status": "not_started" | "ongoing" | "preliminary_report_released" | "final_report_released" | "unknown",
      "investigating_authority": "string" | null
    }],
    "piloting_and_ops": [{
      "headline": "string (≤140)",
      "summary": "string (≤600)",
      "why_it_matters": "string (≤300)",
      "importance": 1..5,
      "confidence": "confirmed" | "preliminary" | "unverified",
      "tags": ["string (max 5)"],
      "source_ids": ["R001"],
      "subcategory": "sop_procedures" | "training_crm" | "regulation" | "safety_alert" | "human_factors" | "avionics_technology",
      "regulators": ["EASA" | "FAA" | "SHGM" | "ICAO" | "UK_CAA" | "Other" | "None" (1-3 adet)],
      "operational_takeaway": "string"
    }],
    "ai_developments": [{
      "headline": "string (≤140)",
      "summary": "string (≤600)",
      "why_it_matters": "string (≤300)",
      "importance": 1..5,
      "confidence": "confirmed" | "preliminary" | "unverified",
      "tags": ["string (max 5)"],
      "source_ids": ["R001"],
      "subcategory": "foundation_model" | "dev_tools" | "research" | "open_source" | "infrastructure_chips" | "policy_safety" | "product_launch",
      "entities": ["string (max 6)"],
      "developer_impact": "string"
    }]
  }
}`;

/**
 * Düz-metin yanıtından markdown kod bloğu (```json ... ```) veya çevreleyici metni ayıklayıp saf JSON nesnesini döndürür.
 */
export function extractJsonObject(rawText: string): string {
  let cleaned = rawText.trim();
  const fenceMatch = /```(?:json)?\s*([\s\S]*?)```/i.exec(cleaned);
  if (fenceMatch && fenceMatch[1]) {
    cleaned = fenceMatch[1].trim();
  }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1);
  }
  return cleaned;
}

function formatZodIssues(err: unknown): string {
  if (
    typeof err === 'object' &&
    err !== null &&
    'issues' in err &&
    Array.isArray((err as { issues: unknown[] }).issues)
  ) {
    const issues = (
      err as { issues: Array<{ path?: unknown[]; message?: string }> }
    ).issues;
    return issues
      .slice(0, 8)
      .map((iss) => {
        const pathStr = Array.isArray(iss.path) ? iss.path.join('.') : '';
        return `${pathStr || 'root'}: ${iss.message ?? 'geçersiz değer'}`;
      })
      .join('; ');
  }
  return err instanceof Error ? err.message : String(err);
}

/**
 * Stage B — Önce yapılandırılmış `responseSchema` ile dener; Gemini'nin constrained-decoding
 * havuzu 503/504 yoğunluğundaysa otomatik olarak düz-metin JSON moduna (schema kısıtsız) geçip
 * çıktıyı `extractJsonObject` + `llmBriefingZod.parse` ile doğrular.
 */
export async function runStructuredStage(input: {
  rssBlock: string;
  groundingBlock: string;
  previousHeadlines: string[];
  dateLabel: string;
  window: { from: Date; to: Date };
}): Promise<LlmBriefing> {
  const maxRepairRetries = 2;
  let limits: {
    commercial: number;
    accidents: number;
    piloting: number;
    ai: number;
  } = {
    commercial: DEFAULT_LIMITS.commercial,
    accidents: DEFAULT_LIMITS.accidents,
    piloting: DEFAULT_LIMITS.piloting,
    ai: DEFAULT_LIMITS.ai,
  };
  let repairInstruction = '';
  let preferPlainJsonMode = false;

  const prevHeadlinesText =
    input.previousHeadlines.length > 0
      ? input.previousHeadlines.map((h) => `- ${h}`).join('\n')
      : '(Önceki gün başlığı yok)';

  for (let attempt = 0; attempt <= maxRepairRetries; attempt += 1) {
    const baseUserPrompt = renderUserPrompt({
      RUN_DATE_TR: input.dateLabel,
      WINDOW_FROM_UTC: input.window.from.toISOString(),
      WINDOW_TO_UTC: input.window.to.toISOString(),
      MAX_COMMERCIAL: limits.commercial,
      MAX_ACCIDENTS: limits.accidents,
      MAX_PILOTING: limits.piloting,
      MAX_AI: limits.ai,
      PREVIOUS_HEADLINES: prevHeadlinesText,
      RSS_BLOCK: input.rssBlock,
      GROUNDING_BLOCK: input.groundingBlock,
    });

    const fullUserPrompt = repairInstruction
      ? `${baseUserPrompt}\n\n${repairInstruction}`
      : baseUserPrompt;

    let response;
    if (!preferPlainJsonMode) {
      try {
        // Önce hızlı responseSchema denemesi: sağlıklı günlerde tek çağrıda biter;
        // 503/504 yoğunluğunda ~15 sn içinde düz-metin JSON moduna geçer.
        response = await generateWithRetry({
          stage: `Stage B (Structured #${attempt + 1})`,
          contents: fullUserPrompt,
          primaryMax503Retries: 1,
          maxHedgeRounds: 1,
          maxRoundOneWaves: 2,
          config: {
            systemInstruction: BRIEFING_SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            responseSchema: briefingResponseSchema,
            temperature: 0.3,
            maxOutputTokens: 8192,
          },
        });
      } catch (schemaErr) {
        logger.warn(
          'Stage B responseSchema modu yoğunluk/hata nedeniyle başarısız oldu; düz-metin JSON moduna geçiliyor...',
          {
            error:
              schemaErr instanceof Error
                ? schemaErr.message
                : String(schemaErr),
          },
        );
        preferPlainJsonMode = true;
      }
    }

    if (!response) {
      response = await generateWithRetry({
        stage: `Stage B (Plain-JSON #${attempt + 1})`,
        contents: fullUserPrompt,
        config: {
          systemInstruction: `${BRIEFING_SYSTEM_PROMPT}${PLAIN_JSON_SCHEMA_CONTRACT}`,
          temperature: 0.3,
          maxOutputTokens: 8192,
        },
      });
    }

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason === FinishReason.MAX_TOKENS) {
      logger.warn(
        'Stage B finishReason=MAX_TOKENS: kategori limitleri ≤ 5 olarak düşürülüp tekrar deneniyor.',
      );
      limits = { commercial: 5, accidents: 5, piloting: 5, ai: 5 };
      repairInstruction =
        'ÖNCEKİ ÇIKTI GEÇERSİZDİ: Çıktı MAX_TOKENS sınırına takıldı. Her kategoride en fazla 5 öğe olacak şekilde öz ve şemaya tam uyan JSON üret.';
      if (attempt < maxRepairRetries) {
        continue;
      }
    }

    const rawText = extractJsonObject(response.text ?? '');
    try {
      if (!rawText) {
        throw new Error('Boş JSON yanıtı döndü.');
      }
      const parsedJson: unknown = JSON.parse(rawText);
      const validated = llmBriefingZod.parse(parsedJson);
      return validated;
    } catch (validationError) {
      const errorSummary = formatZodIssues(validationError);
      logger.warn(`Stage B doğrulama hatası (deneme #${attempt + 1})`, {
        errorSummary,
      });

      if (attempt >= maxRepairRetries) {
        throw new Error(
          `Stage B ${maxRepairRetries + 1} deneme sonunda geçerli LlmBriefing üretemedi: ${errorSummary}`,
        );
      }

      repairInstruction = `ÖNCEKİ ÇIKTI GEÇERSİZDİ: ${errorSummary}. Yalnızca şemaya tam uyan saf JSON üret.`;
      await new Promise((resolve) => setTimeout(resolve, 10_000));
    }
  }

  throw new Error('Stage B beklenmeyen şekilde sonlandı.');
}
