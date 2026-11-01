'use client';

import { useRouter } from 'next/navigation';
import {
  Building2,
  ClipboardCheck,
  KeyRound,
  Receipt,
  Search,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { ROUTES } from '@/constants/routes';
import {
  AGENT_SEARCH_PREVIEW_LIMIT,
  searchAgentRecords,
  type AgentSearchHit,
} from '@/lib/agent-global-search';
import { cn } from '@/lib/utils';

const MIN_QUERY_LENGTH = 2;

const KIND_ICON: Record<string, typeof Building2> = {
  Property: Building2,
  Maintenance: Wrench,
  Inspection: ClipboardCheck,
  'Rent review': Receipt,
  Vacating: KeyRound,
  'Tenant selection': Users,
};

export function AgentGlobalSearch() {
  const router = useRouter();
  const data = useAgentData();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);

  const trimmed = query.trim();
  const results = useMemo(
    () =>
      trimmed.length < MIN_QUERY_LENGTH
        ? []
        : searchAgentRecords(trimmed, {
            properties: data.properties ?? [],
            maintenanceAll: data.maintenanceAll ?? [],
            inspections: data.inspections ?? [],
            rentReviews: data.rentReviews ?? [],
            vacating: data.vacating ?? [],
            tenantSelections: data.tenantSelections ?? [],
          }),
    [trimmed, data.properties, data.maintenanceAll, data.inspections, data.rentReviews, data.vacating, data.tenantSelections],
  );
  const preview = results.slice(0, AGENT_SEARCH_PREVIEW_LIMIT);
  const more = results.length - preview.length;
  const dropdownOpen = focused && trimmed.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setFocused(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  useEffect(() => {
    if (!dropdownOpen) return;
    const place = () => {
      const node = rootRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      setBox({ top: rect.bottom + 6, left: rect.left, width: rect.width });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [dropdownOpen, trimmed, results.length]);

  const openHit = (hit: AgentSearchHit) => {
    setFocused(false);
    router.push(hit.href);
  };

  const openOthers = () => {
    setFocused(false);
    router.push(`${ROUTES.SEARCH}?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div ref={rootRef} className="relative w-full max-w-sm min-w-0">
      <div
        className={cn(
          'flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors',
          focused
            ? 'border-[#00bd85]/45 bg-[#00bd85]/[0.08]'
            : 'border-border/50 bg-transparent hover:border-border',
        )}
      >
        <Search className="text-muted-foreground size-4 shrink-0" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={dropdownOpen}
          aria-controls={dropdownOpen ? listboxId : undefined}
          aria-autocomplete="list"
          placeholder="Search properties, tasks, tenants…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setFocused(false);
              inputRef.current?.blur();
            }
          }}
          className="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {trimmed ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="text-muted-foreground hover:text-foreground flex size-6 items-center justify-center rounded-md"
          >
            <X className="size-3.5" />
          </button>
        ) : (
          <kbd className="text-muted-foreground hidden shrink-0 rounded-md border border-border/60 bg-transparent px-1.5 py-0.5 text-[11px] font-medium sm:inline">
            ⌘ K
          </kbd>
        )}
      </div>

      {dropdownOpen && box
        ? createPortal(
            <div
              ref={menuRef}
              id={listboxId}
              role="listbox"
              style={{ top: box.top, left: box.left, width: Math.max(box.width, 320) }}
              className="bg-popover text-popover-foreground fixed z-[80] overflow-hidden rounded-xl border border-border/80 shadow-lg"
            >
              {preview.length === 0 ? (
                <p className="text-muted-foreground px-3 py-3 text-sm">No matches for “{trimmed}”</p>
              ) : (
                preview.map((hit) => {
                  const Icon = KIND_ICON[hit.kind] ?? Building2;
                  return (
                    <button
                      key={`${hit.kind}-${hit.href}`}
                      type="button"
                      role="option"
                      className="hover:bg-muted/60 flex w-full items-start gap-3 border-b border-border/50 px-3 py-2.5 text-left last:border-b-0"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => openHit(hit)}
                    >
                      <Icon className="mt-0.5 size-4 shrink-0 text-[#067a56]" />
                      <span className="min-w-0 flex-1">
                        <span className="text-foreground block truncate text-sm font-medium">{hit.label}</span>
                        <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                          {hit.kind}
                          {hit.sub ? ` · ${hit.sub}` : ''}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
              {more > 0 ? (
                <button
                  type="button"
                  className="w-full border-t border-border/60 px-3 py-2.5 text-left text-sm font-medium text-[#067a56] hover:bg-muted/60"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={openOthers}
                >
                  View others ({more} more)
                </button>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
