// scripts/notify/ntfy.ts — §7.1 ntfy JSON publish entegrasyonu

import { logger } from '../lib/logger';
import type { NotifyPayload } from './message';

export interface NtfyConfig {
  server?: string;
  topic?: string;
  token?: string;
}

function resolveNtfyConfig(overrides?: NtfyConfig): {
  server: string;
  topic: string | undefined;
  token: string | undefined;
} {
  const server = (
    overrides?.server ??
    process.env.NTFY_SERVER ??
    'https://ntfy.sh'
  )
    .trim()
    .replace(/\/+$/, '');
  const topic = (overrides?.topic ?? process.env.NTFY_TOPIC)?.trim();
  const token = (overrides?.token ?? process.env.NTFY_TOKEN)?.trim();
  return {
    server: server || 'https://ntfy.sh',
    topic: topic && topic.length > 0 ? topic : undefined,
    token: token && token.length > 0 ? token : undefined,
  };
}

/**
 * ntfy sunucusuna kök URL üzerinden JSON POST gönderir (§7.1).
 * NTFY_TOPIC tanımlı değilse 'skipped', hata olursa loglayıp 'error' döner.
 */
export async function sendNtfyNotification(
  payload: NotifyPayload,
  configOverrides?: NtfyConfig,
): Promise<'ok' | 'skipped' | 'error'> {
  const { server, topic, token } = resolveNtfyConfig(configOverrides);
  if (!topic) {
    return 'skipped';
  }

  try {
    const response = await fetch(`${server}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        topic,
        title: payload.title,
        message: payload.body,
        priority: payload.priority,
        tags: payload.tags,
        click: payload.url,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${errText.slice(0, 200)}`);
    }

    logger.info('ntfy bildirimi başarıyla gönderildi.');
    return 'ok';
  } catch (err) {
    logger.warn('ntfy bildirimi gönderilemedi.', {
      error: err instanceof Error ? err.message : String(err),
    });
    return 'error';
  }
}
