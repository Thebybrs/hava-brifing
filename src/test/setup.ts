// src/test/setup.ts — §11 Faz 6 Frontend bileşen testleri için ortak JSDOM temizlik kurulumu

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
});
