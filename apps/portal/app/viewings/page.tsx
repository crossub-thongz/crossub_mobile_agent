import { Building2 } from 'lucide-react';

import { AgentShell } from '@/components/layout/agent-shell';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function ViewingsPage() {
  return (
    <AgentShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Open viewings</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Schedule and manage open inspections for your listings.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="size-4" />
            </div>
            <CardTitle className="text-base">Coming soon</CardTitle>
            <CardDescription>
              Open viewing schedules and visitor management from crossub_web
              will be available here once the inspections API is live.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </AgentShell>
  );
}
