// scripts/gemini/client.ts — §4.3 GoogleGenAI singleton + jitter'lı akıllı backoff + çoklu model fallback wrapper

import {
  GoogleGenAI,
  type GenerateContentConfig,
  type GenerateContentResponse,
} from '@google/genai';
import { loadEnv } from '../config/env';
import { logger } from '../lib/logger';

let aiInstance: GoogleGenAI | null = null;

export const FALLBACK_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
] as const;

const PRIMARY_RETRY_DELAYS_MS = [8_000, 15_000] as const;
const LITE_FALLBACK_DELAYS_MS = [6_000, 10_000, 15_000, 20_000, 25_000] as const;
const OTHER_FALLBACK_DELAYS_MS = [8_000, 15_000] as const;
const ROUND_COOLDOWN_MS = 30_000;
const ROUND_TWO_DELAYS_MS = [8_000, 15_000, 20_000] as const;

/**
 * Ortam değişkeninden GEMINI_API_KEY okuyarak GoogleGenAI singleton döndürür.
 */
export function getAi(): GoogleGenAI {
  if (!aiInstance) {
    const env = loadEnv();
    aiInstance = new GoogleGenAI({
      apiKey: env.GEMINI_API_KEY,
      httpOptions: { timeout: 90_000 },
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

function isPermanentModelError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const status =
    typeof error === 'object' && error !== null && 'status' in error
      ? Number((error as { status?: unknown }).status)
      : NaN;
  return (
    status === 404 ||
    isDailyQuotaExhausted(error) ||
    /\b(404|NOT_FOUND)\b/i.test(msg)
  );
}

function withJitter(baseMs: number): number {
  return baseMs + Math.floor(Math.random() * 3_000);
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

      // Eğer modelin günlük RPD kotası tamamen dolmuşsa veya 404 döndüyse beklemeden doğrudan yedek modele geç
      if (isPermanentModelError(err)) {
        logger.warn(
          `Gemini ${params.stage} (${model}) günlük kota veya model hatası verdi; yedek modele geçilecek.`,
          { model, error: errMsg },
        );
        break;
      }

      if (attempt < delaysMs.length) {
        const delayMs = withJitter(delaysMs[attempt] ?? 15_000);
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
 * Gemini generateContent çağrısını yüksek talep (503 UNAVAILABLE) ve kota (429) dalgalanmalarına dayanıklı şekilde yürütür:
 * 1) Tur 1: Birincil model + tüm yedek modeller (`gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-flash-latest`, `gemini-flash-lite-latest`) jitter'lı backoff ile denenir.
 * 2) Tüm modeller geçici 503/429 verirse 45 sn soğuma sonrası Tur 2 başlatılır.
 * 3) 404 veya günlük kota tükenmesi yaşayan modeller bir daha denenmez.
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
    const delays =
      i === 0
        ? PRIMARY_RETRY_DELAYS_MS
        : model === 'gemini-3.5-flash-lite'
          ? LITE_FALLBACK_DELAYS_MS
          : OTHER_FALLBACK_DELAYS_MS;

    if (i > 0) {
      logger.warn(
        `Gemini ${params.stage}: Önceki model başarısız oldu, yedek model (${model}) deneniyor...`,
      );
    }

    try {
      return await tryGenerateWithModel(ai, model, params, delays);
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

  // Tur 2: Geçici 503 yüksek talep dalgası geçtikten sonra uygun modellerde son bir tur daha dene
  const roundTwoModels = orderedModels.filter((m) => !skippedModels.has(m));
  if (roundTwoModels.length > 0) {
    // Yüksek talep anlarında lite modeller daha hızlı toparlandığı için önce lite'ı, ardından diğerlerini dene
    const prioritizedRoundTwo = [
      ...roundTwoModels.filter((m) => m.includes('lite')),
      ...roundTwoModels.filter((m) => !m.includes('lite')),
    ].slice(0, 3);

    const cooldownMs = withJitter(ROUND_COOLDOWN_MS);
    logger.warn(
      `Gemini ${params.stage}: Tur 1 tüm modellerde geçici hata (503/429) aldı; ${Math.round(cooldownMs / 1000)} sn bekleyip Tur 2 başlatılıyor...`,
      { models: prioritizedRoundTwo },
    );
    await sleep(cooldownMs);

    for (const model of prioritizedRoundTwo) {
      try {
        return await tryGenerateWithModel(
          ai,
          model,
          params,
          ROUND_TWO_DELAYS_MS,
        );
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
