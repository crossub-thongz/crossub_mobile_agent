'use client';

import { cn } from '@/lib/utils';

/**
 * Generic over the id union so a caller can keep its literal type end to end.
 *
 * Callers declare their filters `as const`, which makes them a READONLY tuple of readonly
 * literal ids. The old signature asked for a mutable `{ id: string }[]`, so those callers
 * failed twice over: the tuple was not assignable, and `setFilter` from
 * `useState<'active' | 'done' | 'all'>` was not assignable to `(id: string) => void`
 * because `string` is wider than the state it sets. Widening the props to `string` would
 * have compiled by throwing the union away at the boundary — the id would arrive back at
 * `onChange` as a bare string and the caller would need a cast to narrow it again. `T`
 * keeps the union intact in both directions instead.
 */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  tourIdFor,
}: {
  options: readonly { readonly id: T; readonly label: string }[];
  value: T;
  onChange: (id: T) => void;
  tourIdFor?: (id: T) => string | undefined;
}) {
  return (
    <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          data-tour={tourIdFor?.(opt.id)}
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
