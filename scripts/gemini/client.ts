// scripts/gemini/client.ts — §4.3 Çoklu API anahtarı havuzu + hata tipine duyarlı backoff + hedged paralel lite fallback wrapper

import {
  GoogleGenAI,
  type GenerateContentConfig,
  type GenerateContentResponse,
} from '@google/genai';
import { loadEnv } from '../config/env';
import { logger } from '../lib/logger';

interface NamedAiClient {
  label: string;
  ai: GoogleGenAI;
}

let aiPoolInstance: NamedAiClient[] | null = null;
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
 * Birincil (GEMINI_API_KEY) ve varsa yedek (GEMINI_API_KEY_FALLBACK) GoogleGenAI istemci havuzunu döndürür.
 */
export function getAiPool(): NamedAiClient[] {
  if (!aiPoolInstance) {
    const env = loadEnv();
    const pool: NamedAiClient[] = [
      {
        label: 'primary',
        ai: new GoogleGenAI({
          apiKey: env.GEMINI_API_KEY,
          httpOptions: { timeout: 45_000 },
        }),
      },
    ];

    if (
      env.GEMINI_API_KEY_FALLBACK &&
      env.GEMINI_API_KEY_FALLBACK !== env.GEMINI_API_KEY
    ) {
      pool.push({
        label: 'fallback',
        ai: new GoogleGenAI({
          apiKey: env.GEMINI_API_KEY_FALLBACK,
          httpOptions: { timeout: 45_000 },
        }),
      });
    }

    aiPoolInstance = pool;
  }
  return aiPoolInstance;
}

/**
 * Ortam değişkeninden GEMINI_API_KEY okuyarak birincil GoogleGenAI singleton döndürür.
 */
export function getAi(): GoogleGenAI {
  return getAiPool()[0]!.ai;
}

/**
 * Testlerde istemci havuzunu sıfırlamak için kullanılır.
 */
export function resetAiPoolForTest(): void {
  aiPoolInstance = null;
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

function isNotFoundModelError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const status = getHttpStatus(error);
  return status === 404 || /\b(404|NOT_FOUND)\b/i.test(msg);
}

function isPermanentModelError(error: unknown): boolean {
  return isNotFoundModelError(error) || isDailyQuotaExhausted(error);
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

function pairKey(clientLabel: string, model: string): string {
  return `${clientLabel}:${model}`;
}

function markErrorSkipped(
  err: unknown,
  clientLabel: string,
  model: string,
  pool: readonly NamedAiClient[],
  skippedPairs: Set<string>,
): void {
  if (isNotFoundModelError(err)) {
    for (const c of pool) {
      skippedPairs.add(pairKey(c.label, model));
    }
  } else if (isDailyQuotaExhausted(err)) {
    skippedPairs.add(pairKey(clientLabel, model));
  }
}

export interface GenerateCallParams {
  stage: string;
  model?: string;
  contents: string;
  config: GenerateContentConfig;
  /** İsteğe bağlı: hızlı deneme için hedged tur sayısı (varsayılan: 2) */
  maxHedgeRounds?: number;
  /** İsteğe bağlı: Tur 1 hedged dalga sayısı (varsayılan: 12) */
  maxRoundOneWaves?: number;
  /** İsteğe bağlı: birincil modelde maksimum 503 tekrar sayısı */
  primaryMax503Retries?: number;
}

interface ModelAttemptBudget {
  max503Retries: number;
  max429Retries: number;
  max504Retries: number;
}

function logGeminiSuccess(
  stage: string,
  model: string,
  clientLabel: string,
  durationMs: number,
  response: GenerateContentResponse,
): void {
  const usage = response.usageMetadata;
  lastSucceededModel = model;
  logger.info(`Gemini ${stage} tamamlandı`, {
    model,
    keySlot: clientLabel,
    durationMs,
    promptTokens: usage?.promptTokenCount ?? null,
    candidatesTokens: usage?.candidatesTokenCount ?? null,
    totalTokens: usage?.totalTokenCount ?? null,
    finishReason: response.candidates?.[0]?.finishReason ?? null,
  });
}

async function tryGenerateWithModel(
  client: NamedAiClient,
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
      const response = await client.ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });

      logGeminiSuccess(
        params.stage,
        model,
        client.label,
        Date.now() - startedAt,
        response,
      );
      return response;
    } catch (err) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);

      if (!isRetryableOrFallbackError(err)) {
        throw err;
      }

      if (isPermanentModelError(err)) {
        logger.warn(
          `Gemini ${params.stage} (${model} / ${client.label}) günlük kota veya model hatası verdi; yedek anahtar/modele geçilecek.`,
          { model, keySlot: client.label, error: errMsg },
        );
        break;
      }

      if (isTimeoutError(err)) {
        if (retries504 >= budget.max504Retries) {
          logger.warn(
            `Gemini ${params.stage} (${model} / ${client.label}) zaman aşımına uğradı (504); hızlıca yedeğe geçiliyor.`,
            { model, keySlot: client.label, error: errMsg },
          );
          break;
        }
        const delayMs = withJitter(4_000, 1_500);
        retries504 += 1;
        logger.warn(
          `Gemini ${params.stage} (${model} / ${client.label}) zaman aşımı (504), tekrar deneniyor (#${retries504}/${budget.max504Retries})`,
          { model, keySlot: client.label, delayMs, error: errMsg },
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
          `Gemini ${params.stage} (${model} / ${client.label}) hız limiti (429), yeniden deneniyor (#${retries429}/${budget.max429Retries})`,
          { model, keySlot: client.label, delayMs, error: errMsg },
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
        `Gemini ${params.stage} (${model} / ${client.label}) yüksek talep (503), hızlı yeniden deneniyor (#${retries503}/${budget.max503Retries})`,
        { model, keySlot: client.label, delayMs, error: errMsg },
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

interface HedgeBranchTarget {
  client: NamedAiClient;
  model: string;
}

function selectHedgeBranches(
  pool: readonly NamedAiClient[],
  skippedPairs: Set<string>,
  waveIdx: number,
): HedgeBranchTarget[] {
  const eligibleModels = LITE_HEDGE_POOL.filter((m) =>
    pool.some((c) => !skippedPairs.has(pairKey(c.label, m))),
  );
  if (eligibleModels.length === 0) return [];

  const chosenModels =
    eligibleModels.length <= 2
      ? [...eligibleModels]
      : [
          eligibleModels[0]!,
          eligibleModels[1 + (waveIdx % (eligibleModels.length - 1))]!,
        ];

  return chosenModels.flatMap((model, branchIdx) => {
    const preferredClient = pool[(waveIdx + branchIdx) % pool.length]!;
    const client = !skippedPairs.has(pairKey(preferredClient.label, model))
      ? preferredClient
      : pool.find((c) => !skippedPairs.has(pairKey(c.label, model)));
    return client ? [{ client, model }] : [];
  });
}

async function runHedgedWave(
  branches: readonly HedgeBranchTarget[],
  pool: readonly NamedAiClient[],
  params: GenerateCallParams,
  skippedPairs: Set<string>,
): Promise<GenerateContentResponse> {
  const branchPromises = branches.map(({ client, model }) => {
    const startedAt = Date.now();
    const p = client.ai.models
      .generateContent({
        model,
        contents: params.contents,
        config: params.config,
      })
      .then((response) => ({
        model,
        clientLabel: client.label,
        response,
        durationMs: Date.now() - startedAt,
      }))
      .catch((err) => {
        if (isPermanentModelError(err)) {
          markErrorSkipped(err, client.label, model, pool, skippedPairs);
          logger.warn(
            `Gemini ${params.stage} (${model} / ${client.label}) günlük kota veya model hatası verdi; havuzdan çıkarılıyor.`,
            {
              model,
              keySlot: client.label,
              error: err instanceof Error ? err.message : String(err),
            },
          );
        }
        throw err;
      });

    // Promise.any sonrası geç reddedilen kardeş daldan UnhandledPromiseRejection doğmasını önle
    p.catch(() => {});
    return p;
  });

  const winner = await Promise.any(branchPromises);
  logGeminiSuccess(
    params.stage,
    winner.model,
    winner.clientLabel,
    winner.durationMs,
    winner.response,
  );
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
    if (
      nonRetryable &&
      aggErr.errors.every((e) => !isRetryableOrFallbackError(e))
    ) {
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
 * Gemini generateContent çağrısını çoklu API anahtarı (primary + fallback), yüksek talep (503), zaman aşımı (504) ve kota (429) dalgalanmalarına dayanıklı şekilde yürütür.
 */
export async function generateWithRetry(
  params: GenerateCallParams,
): Promise<GenerateContentResponse> {
  const pool = getAiPool();
  const primaryModel = params.model ?? getModelName();
  const skippedPairs = new Set<string>();
  let lastError: unknown;

  // 1) Birincil model denemesi (tüm uygun API anahtarları üzerinde)
  for (let i = 0; i < pool.length; i += 1) {
    const client = pool[i]!;
    if (skippedPairs.has(pairKey(client.label, primaryModel))) {
      continue;
    }

    const primaryBudget = getPrimaryBudget(primaryModel);
    if (typeof params.primaryMax503Retries === 'number') {
      primaryBudget.max503Retries = params.primaryMax503Retries;
    } else if (i > 0) {
      // Yedek anahtarda birincil modeli hızlıca 1-2 kez dene
      primaryBudget.max503Retries = Math.min(primaryBudget.max503Retries, 1);
    }

    try {
      return await tryGenerateWithModel(
        client,
        primaryModel,
        params,
        primaryBudget,
      );
    } catch (primaryErr) {
      lastError = primaryErr;
      if (!isRetryableOrFallbackError(primaryErr)) {
        throw primaryErr;
      }
      markErrorSkipped(
        primaryErr,
        client.label,
        primaryModel,
        pool,
        skippedPairs,
      );
    }
  }

  // 2) Hedged paralel lite kurtarma turları (çoklu anahtarlar arasında yük dağıtarak)
  const allRounds = [
    {
      roundNumber: 1,
      waves: params.maxRoundOneWaves ?? ROUND_ONE_HEDGE_WAVES,
      cooldownMs: 0,
    },
    {
      roundNumber: 2,
      waves: ROUND_TWO_HEDGE_WAVES,
      cooldownMs: ROUND_TWO_COOLDOWN_MS,
    },
  ] as const;
  const maxRounds = params.maxHedgeRounds ?? allRounds.length;
  const rounds = allRounds.slice(0, Math.max(0, maxRounds));

  for (const round of rounds) {
    const initialBranches = selectHedgeBranches(pool, skippedPairs, 0);
    if (initialBranches.length === 0) {
      break;
    }

    if (round.cooldownMs > 0) {
      const waitMs = withJitter(round.cooldownMs, 3_000);
      logger.warn(
        `Gemini ${params.stage}: Hedged Tur 1 tamamlanamadı; ${Math.round(waitMs / 1000)} sn soğuma sonrası Tur ${round.roundNumber} başlatılıyor...`,
        {
          targets: initialBranches.map((b) => `${b.model}/${b.client.label}`),
        },
      );
      await sleep(waitMs);
    } else {
      logger.warn(
        `Gemini ${params.stage}: Birincil model (${primaryModel}) başarısız oldu; paralel hedged lite kurtarma başlatılıyor...`,
        {
          targets: initialBranches.map((b) => `${b.model}/${b.client.label}`),
        },
      );
    }

    for (let wave = 0; wave < round.waves; wave += 1) {
      const waveBranches = selectHedgeBranches(pool, skippedPairs, wave);
      if (waveBranches.length === 0) {
        break;
      }

      try {
        return await runHedgedWave(waveBranches, pool, params, skippedPairs);
      } catch (aggErr) {
        const parsed = extractHedgeError(aggErr);
        lastError = parsed.lastError;
        if (parsed.fatalError) {
          throw parsed.fatalError;
        }

        const remainingBranches = selectHedgeBranches(
          pool,
          skippedPairs,
          wave + 1,
        );
        if (remainingBranches.length === 0) {
          break;
        }

        if (wave < round.waves - 1) {
          const baseDelay = Math.min(2_500 + wave * 250, 5_000);
          const delayMs = withJitter(baseDelay, 1_500);
          logger.warn(
            `Gemini ${params.stage} hedged dalga (Tur ${round.roundNumber} #${wave + 1}/${round.waves}) başarısız [${waveBranches.map((b) => `${b.model}/${b.client.label}`).join(' + ')}]; yeniden deneniyor`,
            {
              delayMs,
              error:
                lastError instanceof Error
                  ? lastError.message
                  : String(lastError),
            },
          );
          await sleep(delayMs);
        }
      }
    }
  }

  throw lastError;
}
