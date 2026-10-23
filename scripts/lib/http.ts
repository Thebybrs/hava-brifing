// scripts/lib/http.ts — fetch + timeout + User-Agent

import { HTTP_USER_AGENT } from '../config/limits';

export interface HttpFetchOptions {
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export class HttpStatusError extends Error {
  public readonly status: number;
  public readonly url: string;

  constructor(url: string, status: number, statusText: string) {
    super(`HTTP ${status} (${statusText}) — ${url}`);
    this.name = 'HttpStatusError';
    this.status = status;
    this.url = url;
  }
}

export async function fetchTextWithTimeout(
  url: string,
  opts: HttpFetchOptions = {},
): Promise<{ status: number; text: string; contentType: string | null }> {
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': HTTP_USER_AGENT,
        Accept:
          'application/rss+xml, application/atom+xml, application/xml, text/xml, */*;q=0.8',
        ...opts.headers,
      },
    });

    if (!response.ok) {
      throw new HttpStatusError(url, response.status, response.statusText);
    }

    const text = await response.text();
    const contentType = response.headers.get('content-type');
    return { status: response.status, text, contentType };
  } finally {
    clearTimeout(timer);
  }
}
