// scripts/gemini/structured.ts — §4.3 ve §6.1 Stage B (responseSchema) + zod doğrulama + repair retry

import { FinishReason } from '@google/genai';
import type { LlmBriefing } from '@shared/briefing.types';
import { llmBriefingZod } from '@shared/briefing.zod';
import { briefingResponseSchema } from '@shared/gemini-response-schema';
import { DEFAULT_LIMITS } from '@shared/constants';
import { logger } from '../lib/logger';
import { BRIEFING_SYSTEM_PROMPT } from '../prompts/briefing.system';
import { renderUserPrompt } from '../prompts/briefing.user';
import { generateWithRetry } from './client';

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
 * Stage B — Gemini responseSchema ile yapılandırılmış Türkçe LlmBriefing üretir.
 * Davranış (§4.3 ve §6.1):
 * - generateContent(responseSchema) -> JSON.parse -> llmBriefingZod.parse
 * - finishReason === MAX_TOKENS ise kategori limitlerini ≤ 5'e düşürerek tekrar dener.
 * - JSON/Zod doğrulama hatasında max 2 repair retry yapar; her retry'da hata özetini prompta ekler.
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

    const response = await generateWithRetry({
      stage: `Stage B (Structured #${attempt + 1})`,
      contents: fullUserPrompt,
      config: {
        systemInstruction: BRIEFING_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: briefingResponseSchema,
        temperature: 0.3,
        maxOutputTokens: 16384,
        // tools: YOK
      },
    });

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

    const rawText = (response.text ?? '').trim();
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

      repairInstruction = `ÖNCEKİ ÇIKTI GEÇERSİZDİ: ${errorSummary}. Şemaya tam uyan JSON üret.`;
      await new Promise((resolve) => setTimeout(resolve, 3_000));
    }
  }

  throw new Error('Stage B beklenmeyen şekilde sonlandı.');
}
