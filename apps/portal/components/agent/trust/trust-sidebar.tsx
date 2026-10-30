'use client';

import { useState } from 'react';
import {
  ArrowLeftRight,
  Banknote,
  BookOpen,
  FileBarChart,
  FileText,
  Files,
  Upload,
  Landmark,
  LayoutDashboard,
  Menu,
  Receipt,
  Scale,
  ScrollText,
  Settings,
  type LucideIcon,
} from 'lucide-react';

import {
  TRUST_NAV_LABEL,
  TRUST_NAV_SECTION_LABEL,
  TRUST_NAV_SECTIONS,
  TRUST_SCREEN_SUBTITLE,
  TRUST_SCREEN_TITLE,
  TRUST_TAB,
  type TrustTab,
} from '@/constants/trust';
import { cn } from '@/lib/utils';

const TRUST_NAV_ICON: Record<TrustTab, LucideIcon> = {
  [TRUST_TAB.OVERVIEW]: LayoutDashboard,
  [TRUST_TAB.TRANSACTIONS]: ArrowLeftRight,
  [TRUST_TAB.RENT]: Receipt,
  [TRUST_TAB.BILLS]: FileText,
  [TRUST_TAB.DISBURSE]: Banknote,
  [TRUST_TAB.BANK_FILES]: Files,
  [TRUST_TAB.BANK_STATEMENT]: Upload,
  [TRUST_TAB.LEDGERS]: BookOpen,
  [TRUST_TAB.RECONCILIATION]: Scale,
  [TRUST_TAB.REPORTS]: FileBarChart,
  [TRUST_TAB.AUDIT_LOG]: ScrollText,
  [TRUST_TAB.SETTINGS]: Settings,
};

function TrustNavList({
  tab,
  onChange,
}: {
  tab: TrustTab;
  onChange: (tab: TrustTab) => void;
}) {
  return (
    <div className="space-y-5">
      {TRUST_NAV_SECTIONS.map((section) => (
        <div key={section.id}>
          <div className="flex items-center gap-2 px-3 pb-2">
            <span className="text-[11px] font-bold tracking-[0.12em] text-blue-700 uppercase dark:text-blue-300">
              {TRUST_NAV_SECTION_LABEL[section.id]}
            </span>
            <div className="bg-border h-px flex-1" />
          </div>
          <ul className="space-y-1">
            {section.items.map((id) => {
              const Icon = TRUST_NAV_ICON[id];
              const active = tab === id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => onChange(id)}
                    className={cn(
                      'group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-blue-500/10 text-blue-800 dark:text-blue-200'
                        : 'text-slate-600 hover:bg-secondary hover:text-foreground dark:text-muted-foreground',
                    )}
                  >
                    {active ? (
                      <span className="absolute top-0 left-0 h-full w-0.5 rounded-r bg-blue-500 dark:bg-blue-400" />
                    ) : null}
                    <Icon
                      className={cn(
                        'size-4 shrink-0',
                        active
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-muted-foreground group-hover:text-foreground',
                      )}
                    />
                    <span className="flex-1 overflow-hidden text-left whitespace-nowrap">
                      {TRUST_NAV_LABEL[id]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/**
 * The Accounting side menu: the same groups and names as admin Trust Accounting.
 * The portal sidebar shrinks to icons on this page, so this menu stays open with its labels.
 */
export function TrustAccountingSidebar({
  tab,
  onChange,
}: {
  tab: TrustTab;
  onChange: (tab: TrustTab) => void;
}) {
  return (
    <aside className="border-border hidden h-full w-[232px] shrink-0 flex-col border-r bg-transparent lg:flex">
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <TrustNavList tab={tab} onChange={onChange} />
      </nav>
    </aside>
  );
}

/** Opens the same menu on a narrow screen, where the sidebar is hidden. */
export function TrustAccountingMenuButton({
  tab,
  onChange,
}: {
  tab: TrustTab;
  onChange: (tab: TrustTab) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-border bg-card text-foreground inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium lg:hidden"
      >
        <Menu className="size-4" />
        {TRUST_NAV_LABEL[tab]}
      </button>
      {open ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="bg-card absolute inset-y-0 left-0 flex w-[260px] flex-col shadow-xl">
            <div className="border-border flex h-16 shrink-0 items-center gap-3 border-b px-4">
              <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/15">
                <Landmark className="size-4 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <p className="text-sm font-semibold">CROSSUB</p>
                <p className="text-muted-foreground text-[10px]">Trust Accounting</p>
              </div>
            </div>
            <nav className="flex-1 overflow-y-auto p-3">
              <TrustNavList
                tab={tab}
                onChange={(next) => {
                  onChange(next);
                  setOpen(false);
                }}
              />
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function TrustScreenHeading({ tab }: { tab: TrustTab }) {
  return (
    <div className="min-w-0">
      <h1 className="text-2xl font-semibold tracking-tight">{TRUST_SCREEN_TITLE[tab]}</h1>
      <p className="text-muted-foreground mt-1 text-sm">{TRUST_SCREEN_SUBTITLE[tab]}</p>
    </div>
  );
}
