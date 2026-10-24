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

  it('4) Başlık tutamağı ile sürüklendiğinde konum güncellenir ve sıfırlama butonu görünür (Taşındı metni yazmaz)', async () => {
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

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeDefined();

    // Başlangıçta "Konumu sıfırla" butonu olmamalı
    expect(screen.queryByRole('button', { name: /Konumu sıfırla/i })).toBeNull();

    // Sürükleme handle'ını bul (başlık alanı)
    const headerDrag = dialog.firstElementChild as HTMLElement;
    expect(headerDrag).toBeDefined();

    // MouseDown -> MouseMove (sürükleme) -> MouseUp
    fireEvent.mouseDown(headerDrag, {
      clientX: 200,
      clientY: 100,
      button: 0,
    });

    fireEvent.mouseMove(window, {
      clientX: 260,
      clientY: 150,
    });

    fireEvent.mouseUp(window);

    // Kartta "Taşındı" yazısı OLMAMALI (kullanıcı talebi)
    expect(screen.queryByText(/Taşındı/i)).toBeNull();

    // Konumu sıfırla butonu görünür olmalı
    const resetBtn = screen.getByRole('button', { name: /Konumu sıfırla/i });
    expect(resetBtn).toBeDefined();

    // Sıfırla butonuna tıklanınca sıfırlanmalı ve buton kaybolmalı
    fireEvent.click(resetBtn);
    expect(screen.queryByRole('button', { name: /Konumu sıfırla/i })).toBeNull();
  });

  it('5) Taşınmamış durumdayken dışarı tıklandığında kartı kapatır', async () => {
    localStorage.setItem(
      'efb_metar_LTFM',
      JSON.stringify({
        raw: mockMetar,
        fetchedAt: Date.now(),
      }),
    );

    render(
      <div>
        <div data-testid="outside-area">Dış Alan</div>
        <MetarBadge icao="LTFM" />
      </div>,
    );

    const badgeBtn = screen.getByRole('button', {
      name: /LTFM/i,
    });
    fireEvent.click(badgeBtn);

    expect(screen.getByRole('dialog')).toBeDefined();

    // Dış alana tıkla
    const outside = screen.getByTestId('outside-area');
    fireEvent.mouseDown(outside);

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
