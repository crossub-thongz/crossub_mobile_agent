'use client';

import { ChatCrossubBar } from '@/components/agent/chat-crossub-bar';
import { SectionStatusGrid } from '@/components/agent/section-status-grid';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';

export default function StatusPage() {
  const { sectionStatus, messages } = useAgentData();
  const unread = messages.reduce((s, m) => s + m.unread, 0);

  return (
    <AgentShell title="Status">
      <div className="space-y-5">
        <p className="text-muted-foreground text-sm leading-relaxed">
          One place to see where every job stands — tap a section for details.
        </p>
        <SectionStatusGrid sections={sectionStatus} />
        <ChatCrossubBar
          taskLabel={unread > 0 ? `${unread} unread` : 'Questions about any status?'}
          threadId={messages[0]?.id}
        />
      </div>
    </AgentShell>
  );
}
