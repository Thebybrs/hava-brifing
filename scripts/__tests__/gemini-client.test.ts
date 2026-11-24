import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { generateContentMock, envState } = vi.hoisted(() => ({
  generateContentMock: vi.fn(),
  envState: {
    GEMINI_API_KEY: 'test-api-key',
    GEMINI_API_KEY_FALLBACK: undefined as string | undefined,
    GEMINI_MODEL: 'gemini-3.5-flash',
  },
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation((opts: { apiKey: string }) => ({
    models: {
      generateContent: (req: unknown) =>
        generateContentMock(req, opts.apiKey),
    },
  })),
}));

vi.mock('../config/env', () => ({
  loadEnv: () => envState,
}));

vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  generateWithRetry,
  getLastSucceededModel,
  resetAiPoolForTest,
} from '../gemini/client';

describe('Gemini istemcisi retry, hedged failover & çoklu API anahtarı (scripts/gemini/client.ts)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    generateContentMock.mockReset();
    envState.GEMINI_API_KEY = 'test-api-key';
    envState.GEMINI_API_KEY_FALLBACK = undefined;
    envState.GEMINI_MODEL = 'gemini-3.5-flash';
    resetAiPoolForTest();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('1) gemini-3.5-flash-lite üzerinde ardışık 503 UNAVAILABLE hatalarından sonra toparlanır ve getLastSucceededModel değerini günceller', async () => {
    const err503 = Object.assign(
      new Error(
        '{"error":{"code":503,"message":"This model is currently experiencing high demand.","status":"UNAVAILABLE"}}',
      ),
      { status: 503 },
    );

    let callCount = 0;
    generateContentMock.mockImplementation(async () => {
      callCount += 1;
      if (callCount <= 7) {
        throw err503;
      }
      return {
        text: '{"ok":true}',
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: {
          promptTokenCount: 100,
          candidatesTokenCount: 20,
          totalTokens: 120,
        },
      };
    });

    const promise = generateWithRetry({
      stage: 'Test Stage B',
      model: 'gemini-3.5-flash-lite',
      contents: 'test prompt',
      config: {},
    });

    await vi.runAllTimersAsync();
    const res = await promise;

    expect(res.text).toBe('{"ok":true}');
    expect(callCount).toBe(8);
    expect(getLastSucceededModel()).toBe('gemini-3.5-flash-lite');
  });

  it('2) gemini-3.5-flash üzerinde 504 DEADLINE_EXCEEDED alındığında tekrar beklemeden hemen hedged lite yedeğe geçer', async () => {
    const err504 = Object.assign(
      new Error(
        '{"error":{"code":504,"message":"Deadline expired before operation could complete.","status":"DEADLINE_EXCEEDED"}}',
      ),
      { status: 504 },
    );

    const calledModels: string[] = [];
    generateContentMock.mockImplementation(async (req: { model: string }) => {
      calledModels.push(req.model);
      if (req.model === 'gemini-3.5-flash') {
        throw err504;
      }
      return {
        text: '{"fallback":true}',
        candidates: [{ finishReason: 'STOP' }],
      };
    });

    const promise = generateWithRetry({
      stage: 'Test Timeout Failover',
      model: 'gemini-3.5-flash',
      contents: 'test prompt',
      config: {},
    });

    await vi.runAllTimersAsync();
    const res = await promise;

    expect(res.text).toBe('{"fallback":true}');
    expect(calledModels.filter((m) => m === 'gemini-3.5-flash')).toHaveLength(1);
    expect(calledModels).toContain('gemini-3.5-flash-lite');
    expect(calledModels).toContain('gemini-flash-lite-latest');
    expect(['gemini-3.5-flash-lite', 'gemini-flash-lite-latest']).toContain(
      getLastSucceededModel(),
    );
  });

  it('3) 404 NOT_FOUND hatası veren modeli beklemeden atlayıp yedek modelle tamamlar', async () => {
    const err404 = Object.assign(
      new Error(
        '{"error":{"code":404,"message":"models/legacy-model is not found","status":"NOT_FOUND"}}',
      ),
      { status: 404 },
    );

    const calledModels: string[] = [];
    generateContentMock.mockImplementation(async (req: { model: string }) => {
      calledModels.push(req.model);
      if (req.model === 'legacy-model' || req.model === 'gemini-3.5-flash-lite') {
        throw err404;
      }
      return {
        text: '{"ok":true}',
        candidates: [{ finishReason: 'STOP' }],
      };
    });

    const promise = generateWithRetry({
      stage: 'Test 404 Skip',
      model: 'legacy-model',
      contents: 'test prompt',
      config: {},
    });

    await vi.runAllTimersAsync();
    const res = await promise;

    expect(res.text).toBe('{"ok":true}');
    expect(calledModels).toEqual([
      'legacy-model',
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest',
    ]);
    expect(getLastSucceededModel()).toBe('gemini-flash-lite-latest');
  });

  it('4) Hedged paralel devirde gemini-3.5-flash-lite 503 döndürse bile aynı dalgadaki gemini-flash-lite-latest hemen kazanır', async () => {
    const err503 = Object.assign(
      new Error(
        '{"error":{"code":503,"message":"This model is currently experiencing high demand.","status":"UNAVAILABLE"}}',
      ),
      { status: 503 },
    );

    const calledModels: string[] = [];
    generateContentMock.mockImplementation(async (req: { model: string }) => {
      calledModels.push(req.model);
      if (
        req.model === 'gemini-3.5-flash' ||
        req.model === 'gemini-3.5-flash-lite'
      ) {
        throw err503;
      }
      return {
        text: '{"hedged":"flash-lite-latest"}',
        candidates: [{ finishReason: 'STOP' }],
      };
    });

    const promise = generateWithRetry({
      stage: 'Test Hedged Race',
      model: 'gemini-3.5-flash',
      contents: 'test prompt',
      config: {},
    });

    await vi.runAllTimersAsync();
    const res = await promise;

    expect(res.text).toBe('{"hedged":"flash-lite-latest"}');
    expect(calledModels).toEqual([
      'gemini-3.5-flash',
      'gemini-3.5-flash',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest',
    ]);
    expect(getLastSucceededModel()).toBe('gemini-flash-lite-latest');
  });

  it('5) Birincil API anahtarı günlük kota (429 RPD) dolduğunda otomatik olarak GEMINI_API_KEY_FALLBACK anahtarına geçer', async () => {
    envState.GEMINI_API_KEY_FALLBACK = 'fallback-api-key';
    resetAiPoolForTest();

    const errDaily429 = Object.assign(
      new Error(
        '{"error":{"code":429,"message":"GenerateRequestsPerDayPerProjectPerModel requests per day limit exceeded","status":"RESOURCE_EXHAUSTED"}}',
      ),
      { status: 429 },
    );

    const calls: Array<{ model: string; key: string }> = [];
    generateContentMock.mockImplementation(
      async (req: { model: string }, apiKey: string) => {
        calls.push({ model: req.model, key: apiKey });
        if (apiKey === 'test-api-key') {
          throw errDaily429;
        }
        return {
          text: '{"from":"fallback-key"}',
          candidates: [{ finishReason: 'STOP' }],
        };
      },
    );

    const promise = generateWithRetry({
      stage: 'Test Multi-Key Failover',
      model: 'gemini-3.5-flash',
      contents: 'test prompt',
      config: {},
    });

    await vi.runAllTimersAsync();
    const res = await promise;

    expect(res.text).toBe('{"from":"fallback-key"}');
    expect(calls).toEqual([
      { model: 'gemini-3.5-flash', key: 'test-api-key' },
      { model: 'gemini-3.5-flash', key: 'fallback-api-key' },
    ]);
    expect(getLastSucceededModel()).toBe('gemini-3.5-flash');
  });
});
