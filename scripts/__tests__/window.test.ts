import { describe, expect, it } from 'vitest';
import { computeWindow, formatTrtLong, trtDateString } from '../lib/window';

describe('window.ts — TRT tarih ve 24 saatlik pencere hesabı', () => {
  it('TRT gün sınırı vaka 1: UTC 20:59:59 (TRT 23:59:59) aynı günde kalır', () => {
    const d = new Date('2026-10-23T20:59:59Z');
    expect(trtDateString(d)).toBe('2026-10-23');
  });

  it('TRT gün sınırı vaka 2: UTC 21:00:00 (TRT 00:00:00) ertesi güne geçer', () => {
    const d = new Date('2026-10-23T21:00:00Z');
    expect(trtDateString(d)).toBe('2026-10-24');
  });

  it('TRT gün sınırı vaka 3: Yılbaşı geçişi UTC 2026-12-31T21:30:00Z -> TRT 2027-01-01', () => {
    const d = new Date('2026-12-31T21:30:00Z');
    expect(trtDateString(d)).toBe('2027-01-01');
  });

  it('computeWindow varsayılan olarak tam 24 saatlik pencere döndürür', () => {
    const now = new Date('2026-10-23T05:00:00Z');
    const { from, to } = computeWindow(now);
    expect(to.toISOString()).toBe('2026-10-23T05:00:00.000Z');
    expect(from.toISOString()).toBe('2026-10-22T05:00:00.000Z');
  });

  it('formatTrtLong Türkçe tam tarih biçimi üretir', () => {
    const formatted = formatTrtLong('2026-10-23');
    expect(formatted).toContain('2026');
    expect(formatted.toLowerCase()).toContain('ekim');
  });
});
