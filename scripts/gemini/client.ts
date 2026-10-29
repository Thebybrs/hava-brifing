// scripts/gemini/client.ts — §4.3 GoogleGenAI singleton + 25s/65s akıllı backoff + Model Fallback wrapper

import {
  GoogleGenAI,
  type GenerateContentConfig,
  type GenerateContentResponse,
} from '@google/genai';
import { loadEnv } from '../config/env';
import { logger } from '../lib/logger';

let aiInstance: GoogleGenAI | null = null;

const FALLBACK_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
] as const;

const RETRY_DELAYS_MS = [25_000, 65_000] as const;

/**
 * Ortam değişkeninden GEMINI_API_KEY okuyarak GoogleGenAI singleton döndürür.
 */
export function getAi(): GoogleGenAI {
  if (!aiInstance) {
    const env = loadEnv();
    aiInstance = new GoogleGenAI({
      apiKey: env.GEMINI_API_KEY,
      httpOptions: { timeout: 120_000 },
    });
  }
  return aiInstance;
}

export function getModelName(): string {
  const env = loadEnv();
  return env.GEMINI_MODEL;
}

function isRetryableOrFallbackError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const status =
    typeof error === 'object' && error !== null && 'status' in error
      ? Number((error as { status?: unknown }).status)
      : NaN;

  if (
    status === 429 ||
    status === 404 ||
    (status >= 500 && status < 600)
  ) {
    return true;
  }

  return /\b(429|404|500|502|503|504|RESOURCE_EXHAUSTED|UNAVAILABLE|NOT_FOUND|DEADLINE_EXCEEDED|fetch failed|ETIMEDOUT|ECONNRESET)\b/i.test(
    msg,
  );
}

function isDailyQuotaExhausted(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /GenerateRequestsPerDayPerProjectPerModel|requests per day limit exceeded/i.test(
    msg,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface GenerateCallParams {
  stage: string;
  model?: string;
  contents: string;
  config: GenerateContentConfig;
}

async function tryGenerateWithModel(
  ai: GoogleGenAI,
  model: string,
  params: GenerateCallParams,
  delaysMs: readonly number[],
): Promise<GenerateContentResponse> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= delaysMs.length; attempt += 1) {
    try {
      const startedAt = Date.now();
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });

      const durationMs = Date.now() - startedAt;
      const usage = response.usageMetadata;
      logger.info(`Gemini ${params.stage} tamamlandı`, {
        model,
        durationMs,
        promptTokens: usage?.promptTokenCount ?? null,
        candidatesTokens: usage?.candidatesTokenCount ?? null,
        totalTokens: usage?.totalTokenCount ?? null,
        finishReason: response.candidates?.[0]?.finishReason ?? null,
      });

      return response;
    } catch (err) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);

      if (!isRetryableOrFallbackError(err)) {
        throw err;
      }

      // Eğer modelin günlük RPD kotası tamamen dolmuşsa veya 404 döndüyse aynı modelde beklemeden doğrudan fallback modele geç
      if (isDailyQuotaExhausted(err) || /\b(404|NOT_FOUND)\b/i.test(errMsg)) {
        logger.warn(
          `Gemini ${params.stage} (${model}) günlük kota veya model hatası verdi; yedek modele geçilecek.`,
          { model, error: errMsg },
        );
        break;
      }

      if (attempt < delaysMs.length) {
        const delayMs = delaysMs[attempt] ?? 25_000;
        logger.warn(
          `Gemini ${params.stage} (${model}) yeniden deneniyor (deneme #${attempt + 1}/${delaysMs.length})`,
          {
            model,
            delayMs,
            error: errMsg,
          },
        );
        await sleep(delayMs);
      }
    }
  }

  throw lastError;
}

/**
 * Gemini generateContent çağrısını:
 * 1) Birincil modelde 25 sn ve 65 sn backoff ile dener,
 * 2) 429/503/404 durumunda otomatik olarak yedek modellere (`gemini-3.5-flash` -> `gemini-3.5-flash-lite`) fallback yapar.
 */
export async function generateWithRetry(
  params: GenerateCallParams,
): Promise<GenerateContentResponse> {
  const ai = getAi();
  const primaryModel = params.model ?? getModelName();

  try {
    return await tryGenerateWithModel(
      ai,
      primaryModel,
      params,
      RETRY_DELAYS_MS,
    );
  } catch (primaryErr) {
    if (!isRetryableOrFallbackError(primaryErr)) {
      throw primaryErr;
    }

    const fallbackCandidates = FALLBACK_MODELS.filter(
      (m) => m !== primaryModel,
    );

    let lastFallbackErr: unknown = primaryErr;
    for (const fallbackModel of fallbackCandidates) {
      logger.warn(
        `Gemini ${params.stage}: Birincil model (${primaryModel}) başarısız oldu, yedek model (${fallbackModel}) deneniyor...`,
      );
      try {
        return await tryGenerateWithModel(
          ai,
          fallbackModel,
          params,
          [25_000],
        );
      } catch (fbErr) {
        lastFallbackErr = fbErr;
        if (!isRetryableOrFallbackError(fbErr)) {
          throw fbErr;
        }
      }
    }

    throw lastFallbackErr;
  }
}
