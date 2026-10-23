// scripts/config/limits.ts — Token/öğe bütçeleri ve retry ayarları

import { DEFAULT_LIMITS } from '@shared/constants';

export const PIPELINE_LIMITS = {
  /** Zaman penceresi uzunluğu (saat) */
  WINDOW_HOURS: 24,
  /** RSS filtreleme sonrası Gemini promptuna girecek maksimum öğe sayısı */
  MAX_RSS_ITEMS: 140,
  /** selectWithinBudget sırasında her feed grubuna ayrılan minimum kota */
  MIN_QUOTA_PER_GROUP: 10,
  /** Normalize başlık maksimum karakter uzunluğu */
  MAX_TITLE_CHARS: 200,
  /** Normalize özet (snippet) maksimum karakter uzunluğu */
  MAX_SNIPPET_CHARS: 400,
  /** Başlık benzerliği (Jaccard) tekilleştirme eşiği */
  DEDUPE_JACCARD_THRESHOLD: 0.8,
  /** RSS tekil HTTP isteği zaman aşımı (ms) */
  FEED_TIMEOUT_MS: 15_000,
  /** RSS isteği yeniden deneme sayısı */
  FEED_RETRIES: 1,
  /** RSS yeniden deneme başlangıç bekleme süresi (ms) */
  FEED_RETRY_BASE_MS: 1_000,
  /** Kategori başına maksimum öğe sınırları */
  CATEGORY_MAX: DEFAULT_LIMITS,
} as const;

export const HTTP_USER_AGENT =
  'HavaBrifing/1.0 (+https://github.com/hava-brifing)';
