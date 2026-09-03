'use client';

import Link from 'next/link';
import { Building2, CheckCircle2, FolderArchive, Lightbulb, ListTodo } from 'lucide-react';

import type { AgentTutorialModule } from '@/constants/agent-module-tutorial';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';

const MODULE_ICON = {
  properties: Building2,
  tasks: ListTodo,
  history: FolderArchive,
} as const;

export function AgentModuleTutorial({
  modules,
  activeId,
  onSelect,
}: {
  modules: AgentTutorialModule[];
  activeId: AgentTutorialModuleId;
  onSelect: (id: AgentTutorialModuleId) => void;
}) {
  const active = modules.find((module) => module.id === activeId) ?? modules[0]!;
  const Icon = MODULE_ICON[active.id];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {modules.map((module) => {
          const TabIcon = MODULE_ICON[module.id];
          const selected = module.id === active.id;
          return (
            <button
              key={module.id}
              type="button"
              onClick={() => onSelect(module.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors',
                selected
                  ? 'border-primary/30 bg-primary/12 text-primary'
                  : 'text-muted-foreground hover:border-primary/20 hover:bg-muted/60 hover:text-foreground',
              )}
            >
              <TabIcon className="size-4" />
              {module.pageName}
            </button>
          );
        })}
      </div>

      <article className="v2-frosted-surface overflow-hidden rounded-2xl border">
        <div className="border-b border-border/60 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="bg-primary/15 text-primary mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl">
              <Icon className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-primary text-[10px] font-semibold uppercase tracking-[0.2em]">
                {active.eyebrow}
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">{active.pageName}</h2>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{active.overview}</p>
              <Link
                href={active.href}
                className="text-primary mt-3 inline-flex text-sm font-medium hover:underline"
              >
                Open {active.pageName} →
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-6 px-5 py-5">
          <section>
            <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              How to use this page
            </h3>
            <ol className="mt-3 space-y-2.5">
              {active.steps.map((step, index) => (
                <li
                  key={step.title}
                  className="flex gap-3 rounded-xl border border-primary/15 bg-primary/[0.04] p-3"
                >
                  <span className="bg-primary/15 text-primary flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              Every function on this page
            </h3>
            <ul className="mt-3 space-y-2">
              {active.functions.map((item) => (
                <li key={item.title} className="rounded-xl border border-border/70 bg-background/50 p-3">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{item.description}</p>
                </li>
              ))}
            </ul>
          </section>

          {active.tips.length > 0 ? (
            <section className="rounded-xl border border-primary/15 bg-primary/[0.04] p-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Lightbulb className="text-primary size-4 shrink-0" />
                Tips
              </div>
              <ul className="mt-2 space-y-1.5">
                {active.tips.map((tip) => (
                  <li key={tip} className="text-muted-foreground flex gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 opacity-60" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </article>
    </div>
  );
}

export { AgentHowToUseLink } from '@/components/agent/agent-page-tour';
