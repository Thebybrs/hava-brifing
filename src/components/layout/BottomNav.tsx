// src/components/layout/BottomNav.tsx — §9.3 Mobil alt sekmeler (Bugün · Ticari · Kaza · Pilotaj · AI)

import {
  Cpu,
  Gauge,
  LayoutDashboard,
  PlaneTakeoff,
  TriangleAlert,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  {
    to: '/',
    label: 'Bugün',
    icon: LayoutDashboard,
    activeColor: 'text-efb-white border-t-efb-cyan',
    end: true,
  },
  {
    to: '/c/commercial_aviation',
    label: 'Ticari',
    icon: PlaneTakeoff,
    activeColor: 'text-efb-cyan border-t-efb-cyan',
    end: false,
  },
  {
    to: '/c/accidents_and_incidents',
    label: 'Kaza',
    icon: TriangleAlert,
    activeColor: 'text-efb-amber border-t-efb-amber',
    end: false,
  },
  {
    to: '/c/piloting_and_ops',
    label: 'Pilotaj',
    icon: Gauge,
    activeColor: 'text-efb-green border-t-efb-green',
    end: false,
  },
  {
    to: '/c/ai_developments',
    label: 'AI',
    icon: Cpu,
    activeColor: 'text-efb-magenta border-t-efb-magenta',
    end: false,
  },
] as const;

export function BottomNav() {
  return (
    <nav
      aria-label="Ana gezinme"
      className="fixed bottom-0 inset-x-0 z-30 bg-efb-panel/95 backdrop-blur border-t border-efb-line safe-bottom"
    >
      <div className="max-w-3xl mx-auto grid grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `min-h-[52px] flex flex-col items-center justify-center gap-0.5 border-t-2 transition-colors ${
                  isActive
                    ? `${item.activeColor} bg-efb-panel2/60 font-semibold`
                    : 'border-t-transparent text-efb-muted hover:text-efb-text'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-mono uppercase tracking-wider">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
