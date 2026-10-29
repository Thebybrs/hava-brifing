// scripts/config/env.ts — zod ile ortam değişkenleri doğrulaması

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dotenvPath = path.resolve(__dirname, '../../.env');

let dotenvLoaded = false;

function loadDotenvIfPresent(): void {
  if (dotenvLoaded) return;
  dotenvLoaded = true;
  if (!existsSync(dotenvPath)) return;

  try {
    const content = readFileSync(dotenvPath, 'utf-8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx <= 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      const hashIdx = val.indexOf(' #');
      if (hashIdx !== -1) {
        val = val.slice(0, hashIdx).trim();
      }
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined && val.length > 0) {
        process.env[key] = val;
      }
    }
  } catch {
    // .env okunamazsa sessizce process.env ile devam et
  }
}

const booleanEnvZod = z
  .string()
  .optional()
  .transform((val) => {
    if (val === undefined || val.trim() === '') return undefined;
    const lower = val.trim().toLowerCase();
    return lower === 'true' || lower === '1' || lower === 'yes';
  });

const optionalTrimmedString = z
  .string()
  .optional()
  .transform((val) => {
    if (val === undefined) return undefined;
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  });

export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash';
export const FALLBACK_GEMINI_MODEL = 'gemini-3.5-flash-lite';

export const envSchemaZod = z.object({
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY zorunludur.'),
  GEMINI_MODEL: optionalTrimmedString.transform((v) =>
    v ? v.replace(/^gemini-2\.5-/, 'gemini-3.5-') : DEFAULT_GEMINI_MODEL,
  ),
  BRIEFING_DATE: optionalTrimmedString.refine(
    (v) => v === undefined || /^\d{4}-\d{2}-\d{2}$/.test(v),
    'BRIEFING_DATE YYYY-MM-DD biçiminde olmalıdır.',
  ),
  DRY_RUN: booleanEnvZod.transform((v) => v ?? false),
  NOTIFY: booleanEnvZod.transform((v) => v ?? true),
  ENABLE_GROUNDING: booleanEnvZod.transform((v) => v ?? false),
  SITE_URL: optionalTrimmedString.transform(
    (v) => v ?? 'https://thebybrs.github.io/hava-brifing/',
  ),
  NTFY_SERVER: optionalTrimmedString.transform((v) => v ?? 'https://ntfy.sh'),
  NTFY_TOPIC: optionalTrimmedString,
  NTFY_TOKEN: optionalTrimmedString,
  TELEGRAM_BOT_TOKEN: optionalTrimmedString,
  TELEGRAM_CHAT_ID: optionalTrimmedString,
});

export type AppEnv = z.infer<typeof envSchemaZod>;

let cachedEnv: AppEnv | null = null;

export function loadEnv(raw: NodeJS.ProcessEnv = process.env): AppEnv {
  if (raw === process.env) {
    loadDotenvIfPresent();
    if (cachedEnv) {
      return cachedEnv;
    }
  }
  const parsed = envSchemaZod.parse(raw);
  if (raw === process.env) {
    cachedEnv = parsed;
  }
  return parsed;
}
