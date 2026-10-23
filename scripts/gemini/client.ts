// scripts/gemini/client.ts — §4.3 GoogleGenAI singleton + retry/log wrapper

import {
  GoogleGenAI,
  type GenerateContentConfig,
  type GenerateContentResponse,
} from '@google/genai';
import { loadEnv } from '../config/env';
import { logger } from '../lib/logger';
import { withRetry } from '../lib/retry';

let aiInstance: GoogleGenAI | null = null;

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

function isRetryableGeminiError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const status =
    typeof error === 'object' && error !== null && 'status' in error
      ? Number((error as { status?: unknown }).status)
      : NaN;

  if (status === 429 || (status >= 500 && status < 600)) {
    return true;
  }

  return /\b(429|500|502|503|504|RESOURCE_EXHAUSTED|UNAVAILABLE|DEADLINE_EXCEEDED|fetch failed|ETIMEDOUT|ECONNRESET)\b/i.test(
    msg,
  );
}

export interface GenerateCallParams {
  stage: string;
  model?: string;
  contents: string;
  config: GenerateContentConfig;
}

/**
 * Gemini generateContent çağrısını 429/5xx hatalarına karşı 3 deneme (2->4->8 sn + jitter) ile sarmalar
 * ve süre ile usageMetadata değerlerini loglar.
 */
export async function generateWithRetry(
  params: GenerateCallParams,
): Promise<GenerateContentResponse> {
  const ai = getAi();
  const model = params.model ?? getModelName();
  const startedAt = Date.now();

  const response = await withRetry(
    async () => {
      return await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
    },
    {
      retries: 2, // ilk deneme + 2 retry = toplam 3 deneme (4s -> 8s -> 15s)
      baseDelayMs: 4_000,
      maxDelayMs: 15_000,
      shouldRetry: (err) => isRetryableGeminiError(err),
      onRetry: (err, attempt, delayMs) => {
        logger.warn(
          `Gemini ${params.stage} çağrısı yeniden deneniyor (deneme #${attempt})`,
          {
            delayMs,
            error: err instanceof Error ? err.message : String(err),
          },
        );
      },
    },
  );

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
}
