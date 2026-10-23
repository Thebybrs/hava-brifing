// scripts/gemini/grounding.ts — §4.3 ve §6.1 Stage A (googleSearch)

import type { FeedGroup } from '../config/sources';
import { logger } from '../lib/logger';
import {
  GROUNDING_SYSTEM_PROMPT,
  renderGroundingUserPrompt,
} from '../prompts/grounding.system';
import { applyCitations } from './citations';
import { generateWithRetry } from './client';

export interface GroundingSource {
  ref: string /* "G1" */;
  title: string;
  url: string;
  domain: string;
}

export interface GroundingResult {
  notes: string;                      // inline [G1][G2] citation'lı düz metin
  sources: GroundingSource[];
  queries: string[];                  // webSearchQueries
  used: boolean;                      // false: hata/boş -> pipeline devam eder
}

function formatTitlesList(titles: string[] | undefined): string {
  if (!titles || titles.length === 0) return '(yok)';
  return titles.slice(0, 25).join(' | ');
}

/**
 * Stage A — Google Search Grounding ile RSS'te eksik kalan kritik gelişmeleri araştırır.
 * Hata veya boş sonuç durumunda pipeline'ı durdurmaz; `used: false` döner.
 */
export async function runGroundingStage(ctx: {
  dateLabel: string;
  window: { from: Date; to: Date };
  coveredTitlesByGroup: Record<FeedGroup, string[]>;
}): Promise<GroundingResult> {
  try {
    const userPrompt = renderGroundingUserPrompt({
      RUN_DATE_TR: ctx.dateLabel,
      WINDOW_FROM_UTC: ctx.window.from.toISOString(),
      WINDOW_TO_UTC: ctx.window.to.toISOString(),
      COVERED_ACCIDENTS_TITLES: formatTitlesList(
        ctx.coveredTitlesByGroup.accidents,
      ),
      COVERED_AVIATION_TITLES: formatTitlesList(
        ctx.coveredTitlesByGroup.aviation,
      ),
      COVERED_PILOTING_TITLES: formatTitlesList(
        ctx.coveredTitlesByGroup.piloting,
      ),
      COVERED_AI_TITLES: formatTitlesList(ctx.coveredTitlesByGroup.ai),
    });

    const response = await generateWithRetry({
      stage: 'Stage A (Grounding)',
      contents: userPrompt,
      config: {
        systemInstruction: GROUNDING_SYSTEM_PROMPT,
        tools: [{ googleSearch: {} }],
        temperature: 0.2,
        maxOutputTokens: 4096,
        // DİKKAT: responseMimeType / responseSchema YOK (araçla birlikte desteklenmez)
      },
    });

    const rawText = (response.text ?? '').trim();
    const meta = response.candidates?.[0]?.groundingMetadata;
    const queries = (meta?.webSearchQueries ?? []).filter(
      (q): q is string => typeof q === 'string' && q.trim().length > 0,
    );

    if (!rawText) {
      logger.warn('Stage A (Grounding) boş yanıt döndürdü.');
      return { notes: '', sources: [], queries, used: false };
    }

    if (!meta) {
      return {
        notes: rawText,
        sources: [],
        queries,
        used: false,
      };
    }

    const { text: annotatedText, sources } = applyCitations(rawText, meta);
    const used = sources.length > 0;

    return {
      notes: annotatedText,
      sources,
      queries,
      used,
    };
  } catch (error) {
    logger.warn('Stage A (Grounding) başarısız oldu; RSS ile devam ediliyor.', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      notes: '',
      sources: [],
      queries: [],
      used: false,
    };
  }
}
