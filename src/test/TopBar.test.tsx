// @vitest-environment jsdom
// src/test/TopBar.test.tsx — TopBar bileşeni için birim ve responsive düzen testleri

import './setup';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TopBar } from '@/components/layout/TopBar';

describe('TopBar bileşeni', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          'METAR LTFM 241450Z 06009KT 9999 SCT023 16/11 Q1018 NOSIG',
        ),
    } as any);
  });

  it('1) Sol tarafta BRİFİNG EFB logosunu taşma ve ezilmeyi önleyen shrink-0 ile render eder', () => {
    render(
      <MemoryRouter>
        <TopBar activeDate="2026-10-24" />
      </MemoryRouter>,
    );

    const logoLink = screen.getByRole('link', { name: /BRİFİNG/i });
    expect(logoLink).toBeDefined();
    // shrink-0 sınıfı ile mobilde sıkışıp ezilmesi ve üst üste binmesi engellenir
    expect(logoLink.className).toContain('shrink-0');

    const briefingText = screen.getByText(/BRİFİNG/i);
    expect(briefingText).toBeDefined();
    expect(briefingText.className).toContain('whitespace-nowrap');
  });

  it('2) Sağ tarafta LTFM METAR kutusunu ve ZULU saatini render eder', () => {
    render(
      <MemoryRouter>
        <TopBar activeDate="2026-10-24" />
      </MemoryRouter>,
    );

    // LTFM METAR kutusu mevcut olmalı
    const metarBtn = screen.getByRole('button', { name: /LTFM/i });
    expect(metarBtn).toBeDefined();

    // ZULU saati ve arşiv/ayarlar butonları mevcut olmalı
    expect(screen.getByText('ZULU')).toBeDefined();
    expect(screen.getByRole('link', { name: /Arşiv/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /Ayarlar/i })).toBeDefined();
  });

  it('3) Mobil ekranlarda ZULU etiketini gizleyecek responsive sınıfları içerir', () => {
    render(
      <MemoryRouter>
        <TopBar activeDate="2026-10-24" />
      </MemoryRouter>,
    );

    const zuluLabel = screen.getByText('ZULU');
    expect(zuluLabel.className).toContain('hidden sm:inline');
  });
});
