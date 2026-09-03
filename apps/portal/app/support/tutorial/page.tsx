'use client';

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { AgentModuleTutorial } from '@/components/agent/agent-module-tutorial';
import { PageIntro } from '@/components/agent/page-intro';
import { AgentShell } from '@/components/layout/agent-shell';
import {
  AGENT_MODULE_TUTORIAL_ORDER,
  AGENT_MODULE_TUTORIALS,
  isAgentTutorialModuleId,
} from '@/constants/agent-module-tutorial';
import { ROUTES } from '@/constants/routes';

export default function AgentTutorialPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = searchParams.get('page');
  const activeId = isAgentTutorialModuleId(page) ? page : 'properties';
  const modules = useMemo(
    () => AGENT_MODULE_TUTORIAL_ORDER.map((id) => AGENT_MODULE_TUTORIALS[id]),
    [],
  );

  return (
    <AgentShell title="How to use" backHref={ROUTES.FAQ} backLabel="Help">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <PageIntro description="A full walkthrough of Properties, Tasks, and History — what each control does, and how to run your portfolio from those pages." />
        <AgentModuleTutorial
          modules={modules}
          activeId={activeId}
          onSelect={(id) => router.replace(`${ROUTES.SUPPORT_TUTORIAL}?page=${id}`)}
        />
      </div>
    </AgentShell>
  );
}
