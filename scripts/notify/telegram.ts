// scripts/notify/telegram.ts — §7.2 Telegram Bot API sendMessage (HTML) entegrasyonu

import { logger } from '../lib/logger';
import type { NotifyPayload } from './message';

export interface TelegramConfig {
  botToken?: string;
  chatId?: string;
}

const TELEGRAM_MAX_CHARS = 4096;

export function escapeTelegramHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function formatTelegramHtmlMessage(payload: NotifyPayload): string {
  const escapedTitle = escapeTelegramHtml(payload.title);
  const escapedBody = escapeTelegramHtml(payload.body);
  const full = `<b>${escapedTitle}</b>\n\n${escapedBody}`;

  if (full.length <= TELEGRAM_MAX_CHARS) {
    return full;
  }
  return `${full.slice(0, TELEGRAM_MAX_CHARS - 1).trimEnd()}…`;
}

function resolveTelegramConfig(overrides?: TelegramConfig): {
  botToken: string | undefined;
  chatId: string | undefined;
} {
  const botToken = (
    overrides?.botToken ?? process.env.TELEGRAM_BOT_TOKEN
  )?.trim();
  const chatId = (overrides?.chatId ?? process.env.TELEGRAM_CHAT_ID)?.trim();
  return {
    botToken: botToken && botToken.length > 0 ? botToken : undefined,
    chatId: chatId && chatId.length > 0 ? chatId : undefined,
  };
}

/**
 * Telegram Bot API `sendMessage` uç noktasına HTML formatlı bildirim gönderir (§7.2).
 * TELEGRAM_BOT_TOKEN veya TELEGRAM_CHAT_ID yoksa 'skipped', hata durumunda 'error' döner.
 */
export async function sendTelegramNotification(
  payload: NotifyPayload,
  configOverrides?: TelegramConfig,
): Promise<'ok' | 'skipped' | 'error'> {
  const { botToken, chatId } = resolveTelegramConfig(configOverrides);
  if (!botToken || !chatId) {
    return 'skipped';
  }

  try {
    const htmlMessage = formatTelegramHtmlMessage(payload);
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: htmlMessage,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          reply_markup: {
            inline_keyboard: [[{ text: 'Brifingi Aç', url: payload.url }]],
          },
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${errText.slice(0, 200)}`);
    }

    logger.info('Telegram bildirimi başarıyla gönderildi.');
    return 'ok';
  } catch (err) {
    logger.warn('Telegram bildirimi gönderilemedi.', {
      error: err instanceof Error ? err.message : String(err),
    });
    return 'error';
  }
}
