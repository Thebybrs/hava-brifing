// scripts/notify-failure.ts — §7.3 GitHub Actions failure() adımı için hata bildirimi

import { logger } from './lib/logger';
import { notifyAll, type NotifyPayload } from './notify';

async function main(): Promise<void> {
  const runUrl =
    process.env.RUN_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    'https://github.com/';

  const payload: NotifyPayload = {
    title: 'Brifing üretimi BAŞARISIZ',
    body: `Günlük brifing üretim iş akışı hata ile sonlandı.\n\nDetaylar ve loglar için: ${runUrl}`,
    url: runUrl,
    priority: 4,
    tags: ['warning', 'rotating_light'],
  };

  const result = await notifyAll(payload);
  logger.info('Failure bildirimi tamamlandı.', result);
}

main().catch((err) => {
  logger.error('notify-failure beklenmeyen hata:', {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exitCode = 0;
});
