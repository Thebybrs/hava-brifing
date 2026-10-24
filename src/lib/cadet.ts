// src/lib/cadet.ts — Günün havacılık bilgisini deterministik seçme ve gezme fonksiyonları

import { CADET_KNOWLEDGE_CARDS, type CadetKnowledgeCard } from '@/data/cadet-knowledge';

export function getDayOfYear(date: Date = new Date()): number {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

export function getTodayKnowledgeCardIndex(date: Date = new Date()): number {
  const day = getDayOfYear(date);
  const total = CADET_KNOWLEDGE_CARDS.length;
  if (total === 0) return 0;
  return ((day % total) + total) % total;
}

export function getTodayKnowledgeCard(date: Date = new Date()): CadetKnowledgeCard {
  const idx = getTodayKnowledgeCardIndex(date);
  return CADET_KNOWLEDGE_CARDS[idx] ?? CADET_KNOWLEDGE_CARDS[0]!;
}

export function getKnowledgeCardByIndex(index: number): CadetKnowledgeCard {
  const total = CADET_KNOWLEDGE_CARDS.length;
  const safeIdx = ((index % total) + total) % total;
  return CADET_KNOWLEDGE_CARDS[safeIdx] ?? CADET_KNOWLEDGE_CARDS[0]!;
}

export function getTotalKnowledgeCardsCount(): number {
  return CADET_KNOWLEDGE_CARDS.length;
}
