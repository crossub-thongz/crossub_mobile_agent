import { KeyRound } from 'lucide-react';

import { AgentShell } from '@/components/layout/agent-shell';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function KeysPage() {
  return (
    <AgentShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Key handover</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Coordinate key collection and return with property managers.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <KeyRound className="size-4" />
            </div>
            <CardTitle className="text-base">Coming soon</CardTitle>
            <CardDescription>
              Key handover workflows from crossub_web (listing agent coordination,
              pickup scheduling, audit trail) will be exposed here once the
              properties and inspections API modules are implemented.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </AgentShell>
  );
}
