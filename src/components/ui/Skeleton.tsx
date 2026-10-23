// src/components/ui/Skeleton.tsx — Yükleme iskeleti (prefers-reduced-motion uyumlu)

export interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className = '', lines = 3 }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Yükleniyor"
      className={`bg-efb-panel border border-efb-line rounded-md p-4 animate-pulse space-y-2.5 ${className}`.trim()}
    >
      <div className="h-3.5 w-1/3 bg-efb-panel2 rounded" />
      {Array.from({ length: lines }).map((_, idx) => (
        <div
          key={idx}
          className={`h-3 bg-efb-panel2 rounded ${
            idx === lines - 1 ? 'w-2/3' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
}
