// src/App.tsx — §9.4 HashRouter tabanlı rota yapılandırması

import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ArchivePage } from '@/pages/ArchivePage';
import { BriefingByDatePage } from '@/pages/BriefingByDatePage';
import { CategoryPage } from '@/pages/CategoryPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { TodayPage } from '@/pages/TodayPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<TodayPage />} />
          <Route path="/c/:category" element={<CategoryPage />} />
          <Route path="/d/:date" element={<BriefingByDatePage />} />
          <Route path="/archive" element={<ArchivePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
