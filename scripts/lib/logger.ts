// scripts/lib/logger.ts — Yapılandırılmış log (GitHub Actions ::group:: ve ::warning:: destekli)

const isGitHubActions = Boolean(process.env.GITHUB_ACTIONS);

function timestamp(): string {
  return new Date().toISOString();
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>): void {
    const suffix = meta ? ` ${JSON.stringify(meta)}` : '';
    console.log(`[${timestamp()}] INFO  ${message}${suffix}`);
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    const suffix = meta ? ` ${JSON.stringify(meta)}` : '';
    if (isGitHubActions) {
      console.warn(`::warning::${message}${suffix}`);
    } else {
      console.warn(`[${timestamp()}] WARN  ${message}${suffix}`);
    }
  },

  error(message: string, meta?: Record<string, unknown>): void {
    const suffix = meta ? ` ${JSON.stringify(meta)}` : '';
    if (isGitHubActions) {
      console.error(`::error::${message}${suffix}`);
    } else {
      console.error(`[${timestamp()}] ERROR ${message}${suffix}`);
    }
  },

  groupStart(title: string): void {
    if (isGitHubActions) {
      console.log(`::group::${title}`);
    } else {
      console.log(`\n=== [GROUP] ${title} ===`);
    }
  },

  groupEnd(): void {
    if (isGitHubActions) {
      console.log('::endgroup::');
    }
  },

  async group<T>(title: string, fn: () => Promise<T>): Promise<T> {
    this.groupStart(title);
    try {
      return await fn();
    } finally {
      this.groupEnd();
    }
  },
};
