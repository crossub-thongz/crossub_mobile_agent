'use client';

import Link from 'next/link';
import { BookOpen, MessageSquare } from 'lucide-react';

import { AgentFaqSectionList } from '@/components/agent/faq-section';
import { AgentShell } from '@/components/layout/agent-shell';
import { PageIntro } from '@/components/agent/page-intro';
import { AGENT_FAQ_SECTIONS } from '@/constants/agent-faq';
import { ROUTES } from '@/constants/routes';

export default function FaqPage() {
  return (
    <AgentShell title="FAQ" backHref={ROUTES.SETTINGS}>
      <PageIntro description="Answers about your portfolio, leasing, maintenance, inspections, rent, billing, and communications in the CROSSUB Agent Portal." />

      <AgentFaqSectionList sections={AGENT_FAQ_SECTIONS} />

      <div className="from-primary/10 via-card to-card mt-8 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br p-5 shadow-sm">
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          Need more help?
        </p>
        <p className="mt-2 text-sm leading-relaxed">
          Replay in-app guides or open the Properties, Tasks and History tutorial. Message CROSSUB support for account and billing questions.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Link
            href={ROUTES.SUPPORT_TUTORIAL}
            className="hover:border-primary/35 hover:bg-primary/5 flex items-center gap-3 rounded-xl border bg-background/80 px-4 py-3 text-sm font-medium transition-colors"
          >
            <span className="bg-primary/15 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
              <BookOpen className="size-4" />
            </span>
            How to use Properties, Tasks & History
          </Link>
          <Link
            href={ROUTES.SETTINGS}
            className="hover:border-primary/35 hover:bg-primary/5 flex items-center gap-3 rounded-xl border bg-background/80 px-4 py-3 text-sm font-medium transition-colors"
          >
            <span className="bg-primary/15 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
              <BookOpen className="size-4" />
            </span>
            Replay page guides
          </Link>
          <Link
            href={ROUTES.MESSAGES}
            className="hover:border-primary/35 hover:bg-primary/5 flex items-center gap-3 rounded-xl border bg-background/80 px-4 py-3 text-sm font-medium transition-colors sm:col-span-2"
          >
            <span className="bg-primary/15 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
              <MessageSquare className="size-4" />
            </span>
            Messages
          </Link>
        </div>
      </div>
    </AgentShell>
  );
}
