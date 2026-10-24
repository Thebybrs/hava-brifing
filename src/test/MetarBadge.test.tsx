// @vitest-environment jsdom
// src/test/MetarBadge.test.tsx — MetarBadge bileşeni için birim testleri

import './setup';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MetarBadge } from '@/components/layout/MetarBadge';

const mockMetar =
  'METAR LTFM 241450Z 06009KT 9999 SCT023 16/11 Q1018 NOSIG';

describe('MetarBadge bileşeni', () => {
  beforeEach(() => {
    localStorage.clear();
    // Fetch mock
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockMetar),
    } as any);
  });

  it('1) TopBar üzerinde LTFM kutusunu render eder', async () => {
    render(<MetarBadge icao="LTFM" />);

    // LTFM yazısını içeren buton mevcut olmalı
    const badgeBtn = screen.getByRole('button', {
      name: /LTFM/i,
    });
    expect(badgeBtn).toBeDefined();
    expect(badgeBtn.textContent).toContain('LTFM');
  });

  it('2) Kutuya tıklandığında detaylı METAR popover kartını açar ve kapatma butonunu çalıştırır', async () => {
    // Önceden localStorage'a hazır veri yazalım
    localStorage.setItem(
      'efb_metar_LTFM',
      JSON.stringify({
        raw: mockMetar,
        fetchedAt: Date.now(),
      }),
    );

    render(<MetarBadge icao="LTFM" />);

    const badgeBtn = screen.getByRole('button', {
      name: /LTFM/i,
    });

    // Başlangıçta dialog açık olmamalı
    expect(screen.queryByRole('dialog')).toBeNull();

    // Tıklayınca dialog açılmalı
    fireEvent.click(badgeBtn);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeDefined();
    expect(screen.getByText(/İstanbul Havalimanı/i)).toBeDefined();
    expect(screen.getByText(/Rüzgar/i)).toBeDefined();
    expect(screen.getByText(/Altimetre/i)).toBeDefined();
    expect(screen.getByText(/KOPYALA/i)).toBeDefined();

    // Kapatma butonuna basınca kapanmalı
    const closeBtn = screen.getByRole('button', { name: /Kapat/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('3) Escape tuşuna basıldığında açık kartı kapatır', async () => {
    localStorage.setItem(
      'efb_metar_LTFM',
      JSON.stringify({
        raw: mockMetar,
        fetchedAt: Date.now(),
      }),
    );

    render(<MetarBadge icao="LTFM" />);

    const badgeBtn = screen.getByRole('button', {
      name: /LTFM/i,
    });
    fireEvent.click(badgeBtn);

    expect(screen.getByRole('dialog')).toBeDefined();

    // Escape tuşu tetikle
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
