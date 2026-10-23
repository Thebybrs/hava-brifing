// src/pages/NotFoundPage.tsx — §9.4 404 Sayfa bulunamadı

import { Link } from 'react-router-dom';
import { Panel } from '@/components/ui/Panel';

export function NotFoundPage() {
  return (
    <Panel accent="amber" className="p-5 space-y-3">
      <div className="font-mono text-xs text-efb-amber uppercase tracking-widest">
        ECAM CAUTION — SAYFA BULUNAMADI (404)
      </div>
      <p className="text-sm text-efb-text">
        Aradığınız EFB ekranı veya rota mevcut değil.
      </p>
      <Link
        to="/"
        className="inline-block px-3 py-1.5 rounded bg-efb-panel2 hover:bg-efb-line border border-efb-line font-mono text-xs text-efb-cyan"
      >
        Ana Brifinge Dön
      </Link>
    </Panel>
  );
}
