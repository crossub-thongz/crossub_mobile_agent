'use client';

import { cn } from '@/lib/utils';

export function FilterChips({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
            value === opt.id
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-card text-muted-foreground',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
