// src/test/cadet.test.ts — Pilot Akademi günün kartı mantığı testleri

import { describe, expect, it } from 'vitest';
import {
  getDayOfYear,
  getKnowledgeCardByIndex,
  getTodayKnowledgeCard,
  getTodayKnowledgeCardIndex,
  getTotalKnowledgeCardsCount,
} from '@/lib/cadet';

describe('Pilot Akademi Günün Bilgisi Motoru (src/lib/cadet.ts)', () => {
  it('1) Yılın gününü (day of year) tutarlı ve pozitif tam sayı olarak hesaplar', () => {
    const testDate = new Date('2026-10-24T12:00:00Z');
    const doy = getDayOfYear(testDate);
    expect(doy).toBeGreaterThan(290);
    expect(doy).toBeLessThan(305);
  });

  it('2) Kart sayısı en az 15 zengin havacılık kartı içerir', () => {
    const count = getTotalKnowledgeCardsCount();
    expect(count).toBeGreaterThanOrEqual(15);
  });

  it('3) Deterministik gün indeksi geçerli aralıktadır ve aynı günde aynı kartı döndürür', () => {
    const d1 = new Date('2026-10-24T08:00:00Z');
    const d2 = new Date('2026-10-24T20:00:00Z');

    const idx1 = getTodayKnowledgeCardIndex(d1);
    const idx2 = getTodayKnowledgeCardIndex(d2);

    expect(idx1).toBe(idx2);
    expect(idx1).toBeGreaterThanOrEqual(0);
    expect(idx1).toBeLessThan(getTotalKnowledgeCardsCount());

    const card = getTodayKnowledgeCard(d1);
    expect(card.title).toBeDefined();
    expect(card.badgeText).toBeDefined();
  });

  it('4) Döngüsel indeksleme (wrap-around) negatif ve sınır ötesi sayılarda güvenle çalışır', () => {
    const total = getTotalKnowledgeCardsCount();
    const card0 = getKnowledgeCardByIndex(0);
    const cardWrap = getKnowledgeCardByIndex(total);
    const cardNeg = getKnowledgeCardByIndex(-1);

    expect(cardWrap.id).toBe(card0.id);
    expect(cardNeg.id).toBe(getKnowledgeCardByIndex(total - 1).id);
  });
});
