// scripts/gemini/client.ts — §4.3 GoogleGenAI singleton + hata tipine duyarlı backoff + hedged paralel lite fallback wrapper

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

const LITE_HEDGE_POOL = [
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
] as const;

const RATE_LIMIT_DELAYS_MS = [25_000, 65_000] as const;
const FAST_503_BASE_DELAYS_MS = [
  2_000, 2_500, 3_000, 3_500, 4_000, 5_000,
] as const;
const ROUND_TWO_COOLDOWN_MS = 20_000;
const ROUND_ONE_HEDGE_WAVES = 12;
const ROUND_TWO_HEDGE_WAVES = 10;

/**
 * Ortam değişkeninden GEMINI_API_KEY okuyarak GoogleGenAI singleton döndürür.
 */
export function getAi(): GoogleGenAI {
  if (!aiInstance) {
    const env = loadEnv();
    aiInstance = new GoogleGenAI({
      apiKey: env.GEMINI_API_KEY,
      httpOptions: { timeout: 45_000 },
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

  if (status === 429 || status === 404 || (status >= 500 && status < 600)) {
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
  max504Retries: number;
}

function logGeminiSuccess(
  stage: string,
  model: string,
  durationMs: number,
  response: GenerateContentResponse,
): void {
  const usage = response.usageMetadata;
  lastSucceededModel = model;
  logger.info(`Gemini ${stage} tamamlandı`, {
    model,
    durationMs,
    promptTokens: usage?.promptTokenCount ?? null,
    candidatesTokens: usage?.candidatesTokenCount ?? null,
    totalTokens: usage?.totalTokenCount ?? null,
    finishReason: response.candidates?.[0]?.finishReason ?? null,
  });
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
  let retries504 = 0;

  while (true) {
    try {
      const startedAt = Date.now();
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });

      logGeminiSuccess(params.stage, model, Date.now() - startedAt, response);
      return response;
    } catch (err) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);

      if (!isRetryableOrFallbackError(err)) {
        throw err;
      }

      if (isPermanentModelError(err)) {
        logger.warn(
          `Gemini ${params.stage} (${model}) günlük kota veya model hatası verdi; yedek modele geçilecek.`,
          { model, error: errMsg },
        );
        break;
      }

      if (isTimeoutError(err)) {
        if (retries504 >= budget.max504Retries) {
          logger.warn(
            `Gemini ${params.stage} (${model}) zaman aşımına uğradı (504); hızlıca yedek modele geçiliyor.`,
            { model, error: errMsg },
          );
          break;
        }
        const delayMs = withJitter(4_000, 1_500);
        retries504 += 1;
        logger.warn(
          `Gemini ${params.stage} (${model}) zaman aşımı (504), tekrar deneniyor (#${retries504}/${budget.max504Retries})`,
          { model, delayMs, error: errMsg },
        );
        await sleep(delayMs);
        continue;
      }

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

function getPrimaryBudget(model: string): ModelAttemptBudget {
  if (model === 'gemini-3.5-flash-lite') {
    return { max503Retries: 11, max429Retries: 1, max504Retries: 1 };
  }
  return { max503Retries: 2, max429Retries: 1, max504Retries: 0 };
}

function selectHedgePair(
  eligible: readonly string[],
  waveIdx: number,
): string[] {
  if (eligible.length <= 2) {
    return [...eligible];
  }
  // İlk uygun lite modeli (tercihen gemini-3.5-flash-lite) diğer adaylarla dönüşümlü yarıştır
  const partnerIdx = 1 + (waveIdx % (eligible.length - 1));
  return [eligible[0]!, eligible[partnerIdx]!];
}

async function runHedgedWave(
  ai: GoogleGenAI,
  waveModels: readonly string[],
  params: GenerateCallParams,
  skippedModels: Set<string>,
): Promise<GenerateContentResponse> {
  const branchPromises = waveModels.map((model) => {
    const startedAt = Date.now();
    const p = ai.models
      .generateContent({
        model,
        contents: params.contents,
        config: params.config,
      })
      .then((response) => ({
        model,
        response,
        durationMs: Date.now() - startedAt,
      }))
      .catch((err) => {
        if (isPermanentModelError(err)) {
          skippedModels.add(model);
          logger.warn(
            `Gemini ${params.stage} (${model}) günlük kota veya model hatası verdi; havuzdan çıkarılıyor.`,
            { model, error: err instanceof Error ? err.message : String(err) },
          );
        }
        throw err;
      });

    // Promise.any sonrası geç reddedilen kardeş daldan UnhandledPromiseRejection doğmasını önle
    p.catch(() => {});
    return p;
  });

  const winner = await Promise.any(branchPromises);
  logGeminiSuccess(params.stage, winner.model, winner.durationMs, winner.response);
  return winner.response;
}

function extractHedgeError(aggErr: unknown): {
  fatalError: unknown | null;
  lastError: unknown;
} {
  if (aggErr instanceof AggregateError && aggErr.errors.length > 0) {
    const nonRetryable = aggErr.errors.find(
      (err) => !isRetryableOrFallbackError(err),
    );
    if (nonRetryable && aggErr.errors.every((e) => !isRetryableOrFallbackError(e))) {
      return { fatalError: nonRetryable, lastError: nonRetryable };
    }
    return {
      fatalError: null,
      lastError: aggErr.errors[aggErr.errors.length - 1],
    };
  }
  if (!isRetryableOrFallbackError(aggErr)) {
    return { fatalError: aggErr, lastError: aggErr };
  }
  return { fatalError: null, lastError: aggErr };
}

/**
 * Gemini generateContent çağrısını yüksek talep (503 UNAVAILABLE), zaman aşımı (504) ve kota (429) dalgalanmalarına dayanıklı şekilde yürütür:
 * 1) Önce birincil modeli (`gemini-3.5-flash`) dener; normal günlerde tek çağrıda tamamlar, 429/504'te beklemeden yedek havuza devreder.
 * 2) Yedek aşamada iki farklı lite modeli paralel yarıştırarak (`Promise.any` hedged waves) başarı olasılığını artırır ve 504 bloklamasını ortadan kaldırır.
 * 3) Tur 1 (12 dalga) ve 20 sn soğuma sonrası Tur 2 (10 dalga) boyunca geçici hataları atlatır.
 */
export async function generateWithRetry(
  params: GenerateCallParams,
): Promise<GenerateContentResponse> {
  const ai = getAi();
  const primaryModel = params.model ?? getModelName();
  const skippedModels = new Set<string>();
  let lastError: unknown;

  // 1) Birincil model denemesi
  try {
    return await tryGenerateWithModel(
      ai,
      primaryModel,
      params,
      getPrimaryBudget(primaryModel),
    );
  } catch (primaryErr) {
    lastError = primaryErr;
    if (!isRetryableOrFallbackError(primaryErr)) {
      throw primaryErr;
    }
    if (isPermanentModelError(primaryErr)) {
      skippedModels.add(primaryModel);
    }
  }

  // 2) Hedged paralel lite kurtarma turları
  const rounds = [
    { roundNumber: 1, waves: ROUND_ONE_HEDGE_WAVES, cooldownMs: 0 },
    { roundNumber: 2, waves: ROUND_TWO_HEDGE_WAVES, cooldownMs: ROUND_TWO_COOLDOWN_MS },
  ] as const;

  for (const round of rounds) {
    const initialEligible = LITE_HEDGE_POOL.filter(
      (m) => !skippedModels.has(m),
    );
    if (initialEligible.length === 0) {
      break;
    }

    if (round.cooldownMs > 0) {
      const waitMs = withJitter(round.cooldownMs, 3_000);
      logger.warn(
        `Gemini ${params.stage}: Hedged Tur 1 tamamlanamadı; ${Math.round(waitMs / 1000)} sn soğuma sonrası Tur ${round.roundNumber} başlatılıyor...`,
        { models: initialEligible },
      );
      await sleep(waitMs);
    } else {
      logger.warn(
        `Gemini ${params.stage}: Birincil model (${primaryModel}) başarısız oldu; paralel hedged lite kurtarma başlatılıyor...`,
        { models: initialEligible },
      );
    }

    for (let wave = 0; wave < round.waves; wave += 1) {
      const eligible = LITE_HEDGE_POOL.filter((m) => !skippedModels.has(m));
      if (eligible.length === 0) {
        break;
      }

      const waveModels = selectHedgePair(eligible, wave);
      try {
        return await runHedgedWave(ai, waveModels, params, skippedModels);
      } catch (aggErr) {
        const parsed = extractHedgeError(aggErr);
        lastError = parsed.lastError;
        if (parsed.fatalError) {
          throw parsed.fatalError;
        }

        const remainingEligible = LITE_HEDGE_POOL.filter(
          (m) => !skippedModels.has(m),
        );
        if (remainingEligible.length === 0) {
          break;
        }

        if (wave < round.waves - 1) {
          const baseDelay = Math.min(2_500 + wave * 250, 5_000);
          const delayMs = withJitter(baseDelay, 1_500);
          logger.warn(
            `Gemini ${params.stage} hedged dalga (Tur ${round.roundNumber} #${wave + 1}/${round.waves}) başarısız [${waveModels.join(' + ')}]; yeniden deneniyor`,
            { delayMs, error: lastError instanceof Error ? lastError.message : String(lastError) },
          );
          await sleep(delayMs);
        }
      }
    }
  }

  throw lastError;
}
