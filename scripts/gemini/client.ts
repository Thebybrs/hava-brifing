// scripts/gemini/client.ts — §4.3 GoogleGenAI singleton + hata tipine duyarlı akıllı backoff + çoklu model fallback wrapper

import {
  GoogleGenAI,
  type GenerateContentConfig,
  type GenerateContentResponse,
} from '@google/genai';
import { loadEnv } from '../config/env';
import { logger } from '../lib/logger';

let aiInstance: GoogleGenAI | null = null;
let lastSucceededModel: string | null = null;

export const FALLBACK_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
] as const;

const RATE_LIMIT_DELAYS_MS = [25_000, 65_000] as const;
const FAST_503_BASE_DELAYS_MS = [2_500, 3_000, 3_500, 4_000, 5_000, 6_000] as const;
const ROUND_COOLDOWN_MS = 25_000;

/**
 * Ortam değişkeninden GEMINI_API_KEY okuyarak GoogleGenAI singleton döndürür.
 */
export function getAi(): GoogleGenAI {
  if (!aiInstance) {
    const env = loadEnv();
    aiInstance = new GoogleGenAI({
      apiKey: env.GEMINI_API_KEY,
      httpOptions: { timeout: 65_000 },
    });
  }
  return aiInstance;
}

export function getModelName(): string {
  const env = loadEnv();
  return env.GEMINI_MODEL;
}

export function getLastSucceededModel(): string | null {
  return lastSucceededModel;
}

function getHttpStatus(error: unknown): number {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    return Number((error as { status?: unknown }).status);
  }
  return NaN;
}

function isRetryableOrFallbackError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const status = getHttpStatus(error);

  if (
    status === 429 ||
    status === 404 ||
    (status >= 500 && status < 600)
  ) {
    return true;
  }

  return /\b(429|404|500|502|503|504|RESOURCE_EXHAUSTED|UNAVAILABLE|NOT_FOUND|DEADLINE_EXCEEDED|fetch failed|ETIMEDOUT|ECONNRESET|AbortError)\b/i.test(
    msg,
  );
}

function isDailyQuotaExhausted(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /GenerateRequestsPerDayPerProjectPerModel|requests per day limit exceeded/i.test(
    msg,
  );
}

function isPermanentModelError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const status = getHttpStatus(error);
  return (
    status === 404 ||
    isDailyQuotaExhausted(error) ||
    /\b(404|NOT_FOUND)\b/i.test(msg)
  );
}

function isRateLimitError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const status = getHttpStatus(error);
  return status === 429 || /\b(429|RESOURCE_EXHAUSTED)\b/i.test(msg);
}

function isTimeoutError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const status = getHttpStatus(error);
  return (
    status === 504 ||
    /\b(504|DEADLINE_EXCEEDED|ETIMEDOUT|AbortError)\b/i.test(msg)
  );
}

function withJitter(baseMs: number, maxJitterMs = 2_000): number {
  return baseMs + Math.floor(Math.random() * maxJitterMs);
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

interface ModelAttemptBudget {
  max503Retries: number;
  max429Retries: number;
}

async function tryGenerateWithModel(
  ai: GoogleGenAI,
  model: string,
  params: GenerateCallParams,
  budget: ModelAttemptBudget,
): Promise<GenerateContentResponse> {
  let lastError: unknown;
  let retries503 = 0;
  let retries429 = 0;

  while (true) {
    try {
      const startedAt = Date.now();
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });

      const durationMs = Date.now() - startedAt;
      const usage = response.usageMetadata;
      lastSucceededModel = model;
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

      // 404 veya günlük RPD kotası tükendiyse beklemeden doğrudan yedek modele geç
      if (isPermanentModelError(err)) {
        logger.warn(
          `Gemini ${params.stage} (${model}) günlük kota veya model hatası verdi; yedek modele geçilecek.`,
          { model, error: errMsg },
        );
        break;
      }

      // 504 DEADLINE_EXCEEDED: Model uzun süre takıldıysa aynı modelde beklemeden yedek modele geç
      if (isTimeoutError(err)) {
        logger.warn(
          `Gemini ${params.stage} (${model}) zaman aşımına uğradı (504); hızlıca yedek modele geçiliyor.`,
          { model, error: errMsg },
        );
        break;
      }

      // 429 RESOURCE_EXHAUSTED: Dakikalık kota penceresinin sıfırlanması için uzun bekleme
      if (isRateLimitError(err)) {
        if (retries429 >= budget.max429Retries) {
          break;
        }
        const delayMs = withJitter(
          RATE_LIMIT_DELAYS_MS[retries429] ?? 25_000,
          3_000,
        );
        retries429 += 1;
        logger.warn(
          `Gemini ${params.stage} (${model}) hız limiti (429), yeniden deneniyor (#${retries429}/${budget.max429Retries})`,
          { model, delayMs, error: errMsg },
        );
        await sleep(delayMs);
        continue;
      }

      // 503 UNAVAILABLE / 5xx yüksek talep yük dengeleyici reddi:
      // 503 ~1 saniyede döndüğü ve kota harcamadığı için kısa jitter'lı aralıklarla çok sayıda deneme yap
      if (retries503 >= budget.max503Retries) {
        break;
      }
      const baseDelay =
        FAST_503_BASE_DELAYS_MS[
          Math.min(retries503, FAST_503_BASE_DELAYS_MS.length - 1)
        ] ?? 5_000;
      const delayMs = withJitter(baseDelay, 1_500);
      retries503 += 1;
      logger.warn(
        `Gemini ${params.stage} (${model}) yüksek talep (503), hızlı yeniden deneniyor (#${retries503}/${budget.max503Retries})`,
        { model, delayMs, error: errMsg },
      );
      await sleep(delayMs);
    }
  }

  throw lastError;
}

function getRoundOneBudget(model: string, isPrimary: boolean): ModelAttemptBudget {
  if (model === 'gemini-3.5-flash-lite') {
    return { max503Retries: 11, max429Retries: 1 };
  }
  if (isPrimary) {
    return { max503Retries: 3, max429Retries: 1 };
  }
  return { max503Retries: 4, max429Retries: 1 };
}

/**
 * Gemini generateContent çağrısını yüksek talep (503 UNAVAILABLE), zaman aşımı (504) ve kota (429) dalgalanmalarına dayanıklı şekilde yürütür:
 * 1) 503 yük dengeleyici reddi kota harcamadığı için kısa (2.5-6 sn) jitter'lı aralıklarla çok sayıda deneme yapar (özellikle `gemini-3.5-flash-lite` üzerinde).
 * 2) 504 zaman aşımında aynı modelde vakit kaybetmeden hızla yedek modele geçer.
 * 3) Tur 1'de tüm modeller 503/429 verirse 25 sn soğuma sonrası lite öncelikli Tur 2 başlatır.
 */
export async function generateWithRetry(
  params: GenerateCallParams,
): Promise<GenerateContentResponse> {
  const ai = getAi();
  const primaryModel = params.model ?? getModelName();

  const orderedModels = [
    primaryModel,
    ...FALLBACK_MODELS.filter((m) => m !== primaryModel),
  ];

  const skippedModels = new Set<string>();
  let lastError: unknown;

  // Tur 1: Birincil model ve tüm yedek zinciri
  for (let i = 0; i < orderedModels.length; i += 1) {
    const model = orderedModels[i]!;
    if (i > 0) {
      logger.warn(
        `Gemini ${params.stage}: Önceki model başarısız oldu, yedek model (${model}) deneniyor...`,
      );
    }

    try {
      return await tryGenerateWithModel(
        ai,
        model,
        params,
        getRoundOneBudget(model, i === 0),
      );
    } catch (err) {
      lastError = err;
      if (!isRetryableOrFallbackError(err)) {
        throw err;
      }
      if (isPermanentModelError(err)) {
        skippedModels.add(model);
      }
    }
  }

  // Tur 2: Kısa soğuma sonrası lite öncelikli ikinci dalga
  const roundTwoModels = orderedModels.filter((m) => !skippedModels.has(m));
  if (roundTwoModels.length > 0) {
    const prioritizedRoundTwo = [
      ...roundTwoModels.filter((m) => m === 'gemini-3.5-flash-lite'),
      ...roundTwoModels.filter(
        (m) => m !== 'gemini-3.5-flash-lite' && m.includes('lite'),
      ),
      ...roundTwoModels.filter((m) => !m.includes('lite')),
    ].slice(0, 3);

    const cooldownMs = withJitter(ROUND_COOLDOWN_MS, 3_000);
    logger.warn(
      `Gemini ${params.stage}: Tur 1 tüm modellerde geçici hata (503/429) aldı; ${Math.round(cooldownMs / 1000)} sn bekleyip Tur 2 başlatılıyor...`,
      { models: prioritizedRoundTwo },
    );
    await sleep(cooldownMs);

    for (const model of prioritizedRoundTwo) {
      const budget: ModelAttemptBudget =
        model === 'gemini-3.5-flash-lite'
          ? { max503Retries: 11, max429Retries: 1 }
          : { max503Retries: 4, max429Retries: 1 };

      try {
        return await tryGenerateWithModel(ai, model, params, budget);
      } catch (err) {
        lastError = err;
        if (!isRetryableOrFallbackError(err)) {
          throw err;
        }
      }
    }
  }

  throw lastError;
}
