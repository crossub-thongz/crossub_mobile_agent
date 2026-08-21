'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Archive,
  Building2,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
  Gavel,
  KeyRound,
  LayoutGrid,
  MessageSquare,
  Percent,
  Receipt,
  RefreshCw,
  Sparkles,
  Wallet,
  Wrench,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { CROS_ASSISTANT_NAME } from '@/constants/cros-branding';

const TAB_ICONS: Record<string, LucideIcon> = {
  Gii: Sparkles,
  Message: MessageSquare,
  Documents: FileText,
  Fees: Percent,
  Bills: Receipt,
  'Rent Review': RefreshCw,
  Leasing: KeyRound,
  Maintenance: Wrench,
  Inspection: ClipboardList,
  Accounting: Wallet,
  Tribunal: Gavel,
  Archive: Archive,
  Overview: Building2,
};

/** User-facing labels (internal tab ids stay stable for routing). */
const TAB_DISPLAY_LABELS: Record<string, string> = {
  Gii: CROS_ASSISTANT_NAME,
  Message: 'Message',
  Documents: 'Documents',
  Fees: 'Fees',
  Bills: 'Bills',
  'Rent Review': 'Rent Review',
  Leasing: 'Leasing',
  Maintenance: 'Repair',
  Inspection: 'Inspection',
  Accounting: 'Accounting',
  Tribunal: 'Tribunal',
  Archive: 'Archive',
};

/** Compact labels for narrow mobile columns. */
const TAB_SHORT_LABELS: Record<string, string> = {
  Gii: CROS_ASSISTANT_NAME,
  Message: 'Message',
  Documents: 'Docs',
  Fees: 'Fees',
  Bills: 'Bills',
  'Rent Review': 'Rent',
  Leasing: 'Leasing',
  Maintenance: 'Repair',
  Inspection: 'Inspect',
  Accounting: 'Accounts',
  Tribunal: 'Tribunal',
  Archive: 'Archive',
};

export type PropertyViewTab<T extends string> = T | 'Message';

function TabNeedActionBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="bg-destructive pointer-events-none absolute -top-1 -right-1 flex min-w-[1rem] items-center justify-center rounded-full px-0.5 text-[9px] font-bold leading-none text-white"
      aria-hidden
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

function PropertyTabButton<T extends string>({
  tab,
  active,
  onChange,
  variant,
  needActionCount = 0,
  labelOverrides,
}: {
  tab: T;
  active: T;
  onChange: (tab: T) => void;
  variant: 'mobile' | 'desktop';
  needActionCount?: number;
  labelOverrides?: Partial<Record<string, string>>;
}) {
  const Icon = TAB_ICONS[tab] ?? Building2;
  const isActive = active === tab;
  const label = resolveTabLabel(tab, variant === 'mobile' ? 'short' : 'full', labelOverrides);

  const ariaLabel =
    needActionCount > 0
      ? `${label}, ${needActionCount} need action${needActionCount === 1 ? '' : 's'}`
      : label;

  return (
    <button
      type="button"
      onClick={() => onChange(tab)}
      aria-current={isActive ? 'page' : undefined}
      aria-label={ariaLabel}
      className={cn(
        'relative flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors',
        isActive
          ? 'border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20'
          : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',
      )}
    >
      <span className="relative">
        <Icon className="size-3.5" aria-hidden />
        <TabNeedActionBadge count={needActionCount} />
      </span>
      {label}
      {needActionCount > 0 ? (
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
            isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-destructive/15 text-destructive',
          )}
          aria-hidden
        >
          {needActionCount > 99 ? '99+' : needActionCount}
        </span>
      ) : null}
    </button>
  );
}

function resolveTabLabel(
  tab: string,
  variant: 'full' | 'short',
  overrides?: Partial<Record<string, string>>,
): string {
  if (overrides?.[tab]) return overrides[tab]!;
  if (variant === 'short') return TAB_SHORT_LABELS[tab] ?? TAB_DISPLAY_LABELS[tab] ?? tab;
  return TAB_DISPLAY_LABELS[tab] ?? tab;
}

function PropertySectionPicker<T extends string>({
  open,
  onClose,
  tabs,
  active,
  onSelect,
  needActionCounts,
  tabLabels,
}: {
  open: boolean;
  onClose: () => void;
  tabs: readonly T[];
  active: PropertyViewTab<T>;
  onSelect: (tab: PropertyViewTab<T>) => void;
  needActionCounts?: Partial<Record<T, number>>;
  tabLabels?: Partial<Record<string, string>>;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      activeItemRef.current?.scrollIntoView({ block: 'nearest' });
    });
    return () => cancelAnimationFrame(frame);
  }, [open, active]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="pointer-events-auto fixed inset-0 z-[90] flex flex-col justify-end lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close section picker"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(85dvh,calc(100dvh-5rem))] min-h-0 flex-col px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="property-section-picker-title"
          className="animate-in slide-in-from-bottom-4 fade-in-0 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-card shadow-2xl duration-200"
        >
          <p
            id="property-section-picker-title"
            className="text-muted-foreground shrink-0 border-b px-4 py-2.5 text-center text-xs font-medium"
          >
            Property section
          </p>
          <ul
            ref={listRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y"
          >
            {tabs.map((tab, index) => {
              const selected = active === tab;
              const count = needActionCounts?.[tab] ?? 0;
              const label = resolveTabLabel(tab, 'full', tabLabels);

              return (
                <li key={tab}>
                  <button
                    ref={selected ? activeItemRef : undefined}
                    type="button"
                    onClick={() => {
                      onClose();
                      onSelect(tab as PropertyViewTab<T>);
                    }}
                    aria-current={selected ? 'page' : undefined}
                    className={cn(
                      'flex w-full items-center justify-center gap-2 px-4 py-3.5 text-[15px] transition-colors active:bg-secondary/80',
                      index > 0 && 'border-t border-border/60',
                      selected ? 'font-semibold text-primary' : 'font-medium text-foreground',
                    )}
                  >
                    {selected ? <Check className="size-4 shrink-0" aria-hidden /> : null}
                    <span>{label}</span>
                    {count > 0 ? (
                      <span className="bg-destructive rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {count > 99 ? '99+' : count}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="animate-in slide-in-from-bottom-4 fade-in-0 mt-2 shrink-0 rounded-2xl bg-card py-3.5 text-center text-[15px] font-semibold shadow-lg duration-200 active:bg-secondary/80"
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body,
  );
}

function PropertyMobileSegmentBar<T extends string>({
  active,
  onChange,
  onOpenSections,
  sectionPickerOpen,
  messageAlertCount,
  activeSectionLabel,
  activeSectionIcon: ActiveSectionIcon,
  sectionActive,
}: {
  active: PropertyViewTab<T>;
  onChange: (tab: PropertyViewTab<T>) => void;
  onOpenSections: () => void;
  sectionPickerOpen: boolean;
  messageAlertCount: number;
  activeSectionLabel: string;
  activeSectionIcon: LucideIcon;
  sectionActive: boolean;
}) {
  const isGiiActive = active === 'Gii';
  const isMessageActive = active === 'Message';

  return (
    <div className="px-3 py-2.5">
      <div className="bg-muted/45 flex rounded-xl p-1">
        <button
          type="button"
          onClick={() => onChange('Gii' as PropertyViewTab<T>)}
          aria-current={isGiiActive ? 'page' : undefined}
          className={cn(
            'flex min-w-0 flex-1 items-center justify-center rounded-lg py-2 text-xs font-semibold transition-all',
            isGiiActive
              ? 'bg-background text-primary shadow-sm'
              : 'text-muted-foreground active:text-foreground',
          )}
        >
          {CROS_ASSISTANT_NAME}
        </button>
        <button
          type="button"
          onClick={() => onChange('Message')}
          aria-current={isMessageActive ? 'page' : undefined}
          className={cn(
            'relative flex min-w-0 flex-1 items-center justify-center rounded-lg py-2 text-xs font-semibold transition-all',
            isMessageActive
              ? 'bg-background text-primary shadow-sm'
              : 'text-muted-foreground active:text-foreground',
          )}
        >
          Message
          {messageAlertCount > 0 ? (
            <span className="bg-destructive absolute -top-0.5 right-2 flex min-w-[1rem] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white">
              {messageAlertCount > 99 ? '99+' : messageAlertCount}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={onOpenSections}
          aria-expanded={sectionPickerOpen}
          aria-current={sectionActive ? 'page' : undefined}
          className={cn(
            'flex min-w-0 flex-[1.15] items-center justify-center gap-0.5 rounded-lg py-2 pl-1.5 pr-1 text-xs font-semibold transition-all',
            sectionActive || sectionPickerOpen
              ? 'bg-background text-primary shadow-sm'
              : 'text-muted-foreground active:text-foreground',
          )}
        >
          <ActiveSectionIcon className="size-3 shrink-0" aria-hidden />
          <span className="truncate">{activeSectionLabel}</span>
          <ChevronDown
            className={cn(
              'size-3 shrink-0 opacity-60 transition-transform',
              sectionPickerOpen && 'rotate-180',
            )}
            aria-hidden
          />
        </button>
      </div>
    </div>
  );
}

export function PropertyTabBar<T extends string>({
  tabs,
  active,
  onChange,
  needActionCounts,
  messageAlertCount = 0,
  tabLabels,
}: {
  tabs: readonly T[];
  active: PropertyViewTab<T>;
  onChange: (tab: PropertyViewTab<T>) => void;
  needActionCounts?: Partial<Record<T, number>>;
  /** Need-action + unread alerts rolled into the Message tab (mobile). */
  messageAlertCount?: number;
  /** Override display labels (e.g. Bills → Invoice for Level 2). */
  tabLabels?: Partial<Record<string, string>>;
}) {
  const [sectionPickerOpen, setSectionPickerOpen] = useState(false);

  const overflowTabs = useMemo(
    () => tabs.filter((tab) => tab !== 'Gii' && tab !== 'Message'),
    [tabs],
  );
  const isGiiActive = active === 'Gii';
  const isMessageActive = active === 'Message';
  const sectionActive =
    !isGiiActive && !isMessageActive && overflowTabs.includes(active as T);

  const activeSectionLabel = sectionActive
    ? resolveTabLabel(active as string, 'short', tabLabels)
    : 'Sections';
  const ActiveSectionIcon = sectionActive
    ? (TAB_ICONS[active as string] ?? LayoutGrid)
    : LayoutGrid;

  useEffect(() => {
    setSectionPickerOpen(false);
  }, [active]);

  /** Never leave the page scroll-locked — picker uses a fixed overlay only. */
  useEffect(() => {
    if (sectionPickerOpen) return;
    document.body.style.removeProperty('overflow');
  }, [sectionPickerOpen]);

  useEffect(() => {
    return () => {
      document.body.style.removeProperty('overflow');
    };
  }, []);

  const closeSectionPicker = () => {
    setSectionPickerOpen(false);
    document.body.style.removeProperty('overflow');
  };

  return (
    <div
      className={cn(
        'z-30 -mx-4 lg:mx-0',
        'sticky top-[var(--shell-header-height,3.5rem)] lg:static',
        'border-border/60 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/85',
        'border-b lg:border-0 lg:bg-transparent lg:backdrop-blur-none',
      )}
    >
      <div className="relative lg:hidden">
        <PropertyMobileSegmentBar
          active={active}
          onChange={onChange}
          onOpenSections={() =>
            setSectionPickerOpen((open) => {
              if (open) document.body.style.removeProperty('overflow');
              return !open;
            })
          }
          sectionPickerOpen={sectionPickerOpen}
          messageAlertCount={messageAlertCount}
          activeSectionLabel={activeSectionLabel}
          activeSectionIcon={ActiveSectionIcon}
          sectionActive={sectionActive}
        />

        <PropertySectionPicker
          open={sectionPickerOpen}
          onClose={closeSectionPicker}
          tabs={overflowTabs}
          active={active}
          onSelect={onChange}
          needActionCounts={needActionCounts}
          tabLabels={tabLabels}
        />
      </div>

      <div className="scrollbar-none hidden flex-wrap gap-2 lg:flex">
        {tabs
          .filter((tab) => tab !== 'Gii' && tab !== 'Message')
          .map((tab) => (
            <PropertyTabButton
              key={tab}
              tab={tab}
              active={
                overflowTabs.includes(active as T) ? (active as T) : ('' as T)
              }
              onChange={(next) => onChange(next as PropertyViewTab<T>)}
              variant="desktop"
              needActionCount={needActionCounts?.[tab] ?? 0}
              labelOverrides={tabLabels}
            />
          ))}
      </div>
    </div>
  );
}
