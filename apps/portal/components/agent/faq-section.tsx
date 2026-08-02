'use client';

import {
  Building2,
  ChevronDown,
  ClipboardList,
  HelpCircle,
  MessageSquare,
  Receipt,
  Shield,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import type { AgentFaqSection } from '@/constants/agent-faq';
import { cn } from '@/lib/utils';

const SECTION_META: Record<
  string,
  { icon: LucideIcon; accent: string; iconBg: string; border: string }
> = {
  account: {
    icon: Shield,
    accent: 'text-primary',
    iconBg: 'bg-primary/15 text-primary',
    border: 'border-primary/20',
  },
  portfolio: {
    icon: Building2,
    accent: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/25',
  },
  leasing: {
    icon: Users,
    accent: 'text-violet-600 dark:text-violet-400',
    iconBg: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
    border: 'border-violet-500/25',
  },
  maintenance: {
    icon: Wrench,
    accent: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/25',
  },
  inspections: {
    icon: ClipboardList,
    accent: 'text-sky-600 dark:text-sky-400',
    iconBg: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
    border: 'border-sky-500/25',
  },
  financial: {
    icon: Wallet,
    accent: 'text-rose-600 dark:text-rose-400',
    iconBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/25',
  },
  communications: {
    icon: MessageSquare,
    accent: 'text-cyan-600 dark:text-cyan-400',
    iconBg: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-500/25',
  },
  support: {
    icon: Receipt,
    accent: 'text-primary',
    iconBg: 'bg-primary/15 text-primary',
    border: 'border-primary/20',
  },
};

const DEFAULT_META = {
  icon: HelpCircle,
  accent: 'text-primary',
  iconBg: 'bg-primary/15 text-primary',
  border: 'border-primary/20',
};

function scrollToSection(id: string) {
  document.getElementById(`faq-section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function AgentFaqSectionList({
  sections,
  className,
}: {
  sections: AgentFaqSection[];
  className?: string;
}) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? '');

  const totalQuestions = useMemo(
    () => sections.reduce((sum, s) => sum + s.items.length, 0),
    [sections],
  );

  const jumpTo = useCallback((id: string) => {
    setActiveSection(id);
    scrollToSection(id);
  }, []);

  return (
    <div className={cn('space-y-6', className)}>
      <div className="from-primary/12 via-card to-card relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br p-5 shadow-sm">
        <div className="bg-primary/10 pointer-events-none absolute -top-8 -right-8 size-32 rounded-full blur-2xl" />
        <div className="relative flex items-start gap-4">
          <div className="bg-primary/15 text-primary flex size-12 shrink-0 items-center justify-center rounded-2xl shadow-inner">
            <HelpCircle className="size-6" />
          </div>
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Agent help centre
            </p>
            <p className="mt-1 text-lg font-semibold tracking-tight">
              {totalQuestions} answers for your portfolio
            </p>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Leasing, maintenance, inspections, rent, and agency billing — matched to what you
              can do in this portal.
            </p>
          </div>
        </div>
      </div>

      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex min-w-max gap-2">
          {sections.map((section) => {
            const meta = SECTION_META[section.id] ?? DEFAULT_META;
            const Icon = meta.icon;
            const active = activeSection === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => jumpTo(section.id)}
                className={cn(
                  'faq-jump-pill inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium whitespace-nowrap transition-all',
                  active
                    ? 'border-primary/40 bg-primary/10 text-primary shadow-sm'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/25 hover:bg-secondary/80 hover:text-foreground',
                )}
              >
                <Icon className="size-3.5 shrink-0" />
                {section.title}
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] tabular-nums',
                    active ? 'bg-primary/15' : 'bg-secondary',
                  )}
                >
                  {section.items.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-5">
        {sections.map((section, sectionIndex) => {
          const meta = SECTION_META[section.id] ?? DEFAULT_META;
          const Icon = meta.icon;

          return (
            <section
              key={section.id}
              id={`faq-section-${section.id}`}
              className={cn(
                'faq-section scroll-mt-24 overflow-hidden rounded-2xl border bg-card shadow-sm',
                meta.border,
              )}
            >
              <div className="from-secondary/60 to-card flex items-center gap-3 border-b bg-gradient-to-r px-4 py-3.5">
                <div
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm',
                    meta.iconBg,
                  )}
                >
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn('text-[11px] font-semibold tracking-wider uppercase', meta.accent)}>
                    Section {sectionIndex + 1}
                  </p>
                  <h2 className="truncate text-base font-semibold tracking-tight">{section.title}</h2>
                </div>
                <span className="text-muted-foreground bg-secondary/80 rounded-full px-2.5 py-1 text-[11px] font-medium tabular-nums">
                  {section.items.length} Q&amp;A
                </span>
              </div>

              <div className="divide-y divide-border/70 p-2">
                {section.items.map((item, itemIndex) => (
                  <details
                    key={item.question}
                    className="faq-details group rounded-xl transition-colors open:bg-primary/[0.04]"
                  >
                    <summary className="faq-summary flex cursor-pointer list-none items-start gap-3 rounded-xl px-3 py-3.5 text-sm font-medium transition-colors hover:bg-secondary/60 [&::-webkit-details-marker]:hidden">
                      <span className="bg-secondary text-muted-foreground group-open:bg-primary/15 group-open:text-primary mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold tabular-nums transition-colors">
                        {itemIndex + 1}
                      </span>
                      <span className="min-w-0 flex-1 pt-0.5 leading-snug">{item.question}</span>
                      <ChevronDown className="text-muted-foreground group-open:text-primary mt-1 size-4 shrink-0 transition-transform duration-300 group-open:rotate-180" />
                    </summary>
                    <div className="faq-answer">
                      <div className="text-muted-foreground border-primary/20 bg-secondary/30 mx-3 mb-3 rounded-xl border-l-[3px] px-4 py-3.5 text-sm leading-relaxed">
                        {item.answer}
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
