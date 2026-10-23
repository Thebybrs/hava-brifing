// scripts/lib/retry.ts — Exponential backoff + jitter

export interface RetryOptions {
  /** Maksimum yeniden deneme sayısı (örn. 1 ise toplamda en fazla 2 kez çalışır) */
  retries: number;
  /** İlk bekleme süresi (ms) */
  baseDelayMs?: number;
  /** Maksimum bekleme süresi (ms) */
  maxDelayMs?: number;
  /** Hatanın yeniden denenebilir olup olmadığını belirler */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** Yeniden deneme öncesi geri çağırım */
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOptions,
): Promise<T> {
  const {
    retries,
    baseDelayMs = 1000,
    maxDelayMs = 15_000,
    shouldRetry = () => true,
    onRetry,
  } = opts;

  let attempt = 0;
  while (true) {
    try {
      return await fn(attempt);
    } catch (error) {
      if (attempt >= retries || !shouldRetry(error, attempt + 1)) {
        throw error;
      }
      attempt += 1;
      const expDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
      const jitter = Math.floor(Math.random() * Math.max(1, Math.floor(expDelay * 0.25)));
      const delayMs = expDelay + jitter;
      onRetry?.(error, attempt, delayMs);
      await sleep(delayMs);
    }
  }
}
