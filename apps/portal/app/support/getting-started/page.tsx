'use client';

import { AgentShell } from '@/components/layout/agent-shell';
import { PageIntro } from '@/components/agent/page-intro';
import { WelcomeVideoPlayer } from '@/components/agent/welcome-video-player';
import { ROUTES } from '@/constants/routes';

export default function GettingStartedPage() {
  return (
    <AgentShell title="Intro video" backHref={ROUTES.SUPPORT} backLabel="Support">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <PageIntro description="Watch the agent portal welcome video again — how to manage your portfolio, jobs, and messages." />
        <WelcomeVideoPlayer autoPlay />
      </div>
    </AgentShell>
  );
}
