// src/components/briefing/TagList.tsx — §11 Faz 6 Kısa teknik etiket rozetleri

export interface TagListProps {
  tags: string[];
  className?: string;
}

export function TagList({ tags, className = '' }: TagListProps) {
  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 ${className}`.trim()}
      aria-label="Etiketler"
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="px-1.5 py-0.5 rounded bg-efb-bg/80 border border-efb-line font-mono text-[10px] text-efb-muted tracking-wide"
        >
          #{tag}
        </span>
      ))}
    </div>
  );
}
