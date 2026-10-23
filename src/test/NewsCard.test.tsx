// @vitest-environment jsdom
// src/test/NewsCard.test.tsx — §11 Faz 6 NewsCard birim testleri (başlık, ConfidenceChip metni, kaynak linki rel="noopener noreferrer", kategori alanları)

import './setup';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NewsCard } from '@/components/briefing/NewsCard';
import { isItemRead } from '@/lib/storage';
import type { CommercialItem, PilotingItem } from '@/types/briefing';

const mockCommercialItem: CommercialItem = {
  id: 'comm123456',
  subcategory: 'airbus',
  headline: 'Airbus A321XLR İlk Uzun Menzilli Ticari Uçuşunu Tamamladı',
  summary:
    'Iberia filosuna katılan ilk Airbus A321XLR uçağı Madrid-Boston hattında ilk ticari seferini gerçekleştirdi.',
  why_it_matters:
    'Dar gövdeli uçaklarla transatlantik hatlarda birim koltuk maliyetini düşürüyor.',
  entities: ['Airbus', 'A321XLR', 'Iberia'],
  importance: 4,
  confidence: 'confirmed',
  tags: ['A321XLR', 'ETOPS'],
  sources: [
    {
      name: 'Simple Flying',
      url: 'https://simpleflying.com/a321xlr-first-flight',
      published_at: '2026-10-23T10:30:00Z',
      origin: 'rss',
    },
    {
      name: 'FlightGlobal',
      url: 'https://flightglobal.com/a321xlr',
      published_at: null,
      origin: 'grounding',
    },
  ],
};

const mockPilotingItem: PilotingItem = {
  id: 'pilot98765',
  subcategory: 'safety_alert',
  headline: 'EASA Yan Rüzgar İniş Limitleri İçin Yeni SIB Yayınladı',
  summary:
    'EASA, dar gövde uçaklarda ıslak pistte yan rüzgar bileşeni hesaplamalarına ilişkin emniyet bülteni yayınladı. '.repeat(
      4,
    ),
  why_it_matters:
    'Islak ve kontamine pistlerde runway excursion riskini azaltmak için kritik.',
  regulators: ['EASA', 'FAA'],
  operational_takeaway:
    'Yaklaşma brifinginde RCAM tablosuna göre maksimum crosswind limitini teyit edin.',
  importance: 5,
  confidence: 'preliminary',
  tags: ['Crosswind', 'SIB'],
  sources: [
    {
      name: 'EASA Safety Publications',
      url: 'https://ad.easa.europa.eu/sib-2026',
      published_at: '2026-10-23T08:00:00Z',
      origin: 'rss',
    },
  ],
};

describe('NewsCard bileşeni (Faz 6)', () => {
  it('1) Başlığı, ConfidenceChip ("ONAYLI") metnini ve güvenli kaynak linklerini (rel="noopener noreferrer") render eder', () => {
    render(
      <NewsCard item={mockCommercialItem} category="commercial_aviation" />,
    );

    // Başlık kontrolü
    expect(
      screen.getByRole('heading', {
        name: 'Airbus A321XLR İlk Uzun Menzilli Ticari Uçuşunu Tamamladı',
      }),
    ).toBeDefined();

    // ConfidenceChip metni
    expect(screen.getByText('ONAYLI')).toBeDefined();

    // Neden önemli alanı
    expect(screen.getByText('NEDEN ÖNEMLİ')).toBeDefined();
    expect(
      screen.getByText(
        'Dar gövdeli uçaklarla transatlantik hatlarda birim koltuk maliyetini düşürüyor.',
      ),
    ).toBeDefined();

    // Kaynak linki ve rel="noopener noreferrer" + target="_blank"
    const sourceLink = screen.getByRole('link', { name: /Simple Flying/i });
    expect(sourceLink.getAttribute('href')).toBe(
      'https://simpleflying.com/a321xlr-first-flight',
    );
    expect(sourceLink.getAttribute('rel')).toBe('noopener noreferrer');
    expect(sourceLink.getAttribute('target')).toBe('_blank');

    // Grounding kaynağı için WEB rozeti
    expect(screen.getByText('WEB')).toBeDefined();
  });

  it('2) Pilotaj kategorisinde OPS ÇIKARIMI alanını, uzun özette Devamı butonunu ve okundu işaretini çalıştırır', () => {
    render(<NewsCard item={mockPilotingItem} category="piloting_and_ops" />);

    expect(screen.getByText('ÖN BİLGİ')).toBeDefined();
    expect(screen.getByText('OPS ÇIKARIMI')).toBeDefined();
    expect(
      screen.getByText(
        'Yaklaşma brifinginde RCAM tablosuna göre maksimum crosswind limitini teyit edin.',
      ),
    ).toBeDefined();

    // Başlangıçta okunmamış olmalı
    expect(isItemRead(mockPilotingItem.id)).toBe(false);

    // Uzun özet için "Devamı" butonu görünmeli ve tıklanınca "Daralt" olmalı + okundu işaretlenmeli
    const toggleBtn = screen.getByRole('button', { name: /Devamı/i });
    fireEvent.click(toggleBtn);

    expect(screen.getByRole('button', { name: /Daralt/i })).toBeDefined();
    expect(isItemRead(mockPilotingItem.id)).toBe(true);
    expect(screen.getByText('OKUNDU')).toBeDefined();
  });
});
