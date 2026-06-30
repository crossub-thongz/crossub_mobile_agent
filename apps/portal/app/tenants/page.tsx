'use client';

import Link from 'next/link';
import { UserPlus } from 'lucide-react';

import { PageIntro } from '@/components/agent/page-intro';
import { ProvisionedTenantList } from '@/components/agent/provisioned-tenant-list';
import { AgentShell } from '@/components/layout/agent-shell';
import { Button } from '@/components/ui/button';
import { ROUTES, tenantNew } from '@/constants/routes';
import { useAgentStore } from '@/lib/store';

export default function TenantsPage() {
  const provisionedTenants = useAgentStore((s) => s.provisionedTenants);

  return (
    <AgentShell title="Tenant accounts" backHref={ROUTES.LEASING} backLabel="Leasing">
      <div className="space-y-4 pb-8">
        <PageIntro description="Tenant logins you have created for the CROSSUB Tenant App. Tap an account to view and copy credentials." />

        <Button asChild className="w-full">
          <Link href={tenantNew()}>
            <UserPlus className="size-4" />
            Add tenant
          </Link>
        </Button>

        <section>
          <h2 className="mb-2 text-sm font-semibold">
            Created accounts
            {provisionedTenants.length > 0 ? (
              <span className="text-muted-foreground ml-1.5 font-normal tabular-nums">
                ({provisionedTenants.length})
              </span>
            ) : null}
          </h2>
          <ProvisionedTenantList records={provisionedTenants} showAddButton={false} />
        </section>
      </div>
    </AgentShell>
  );
}
