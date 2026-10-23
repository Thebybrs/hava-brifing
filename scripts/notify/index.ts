// scripts/notify/index.ts — §4.4 notifyAll() — hata izole bildirim dağıtıcı

import { buildPayload, type NotifyPayload } from './message';
import { sendNtfyNotification } from './ntfy';
import { sendTelegramNotification } from './telegram';

export { buildPayload, type NotifyPayload };

/**
 * Hem ntfy hem Telegram kanallarını paralel tetikler.
 * Kural (§4.4): Bildirim hatası pipeline'ı FAIL ETTİRMEZ.
 */
export async function notifyAll(p: NotifyPayload): Promise<{
  ntfy: 'ok' | 'skipped' | 'error';
  telegram: 'ok' | 'skipped' | 'error';
}> {
  const [ntfy, telegram] = await Promise.all([
    sendNtfyNotification(p),
    sendTelegramNotification(p),
  ]);

  return { ntfy, telegram };
}
