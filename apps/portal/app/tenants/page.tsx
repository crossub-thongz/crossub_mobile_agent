'use client';

import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { PageIntro } from '@/components/agent/page-intro';
import { ProvisionedTenantList } from '@/components/agent/provisioned-tenant-list';
import { AgentShell } from '@/components/layout/agent-shell';
import { Button } from '@/components/ui/button';
import { ROUTES, tenantNew } from '@/constants/routes';
import { fetchAgentTenants } from '@/lib/crossub-api/agent-client';
import {
  mergeProvisionedTenantRecords,
  recordFromServerTenant,
  type ProvisionedTenantRecord,
} from '@/lib/provisioned-tenant-records';
import { useAgentStore } from '@/lib/store';

export default function TenantsPage() {
  const provisionedTenants = useAgentStore((s) => s.provisionedTenants);

  // Server list (`GET /agent/tenants`) is the source of truth; device-local
  // records contribute passwords and rows the server can't attribute yet.
  const [serverTenants, setServerTenants] = useState<ProvisionedTenantRecord[] | null>(null);

  useEffect(() => {
    let active = true;
    void fetchAgentTenants()
      .then((tenants) => {
        if (active) setServerTenants(tenants.map(recordFromServerTenant));
      })
      .catch(() => {
        if (active) setServerTenants(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const records = useMemo(
    () =>
      serverTenants
        ? mergeProvisionedTenantRecords(provisionedTenants, serverTenants)
        : provisionedTenants,
    [provisionedTenants, serverTenants],
  );

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
            {records.length > 0 ? (
              <span className="text-muted-foreground ml-1.5 font-normal tabular-nums">
                ({records.length})
              </span>
            ) : null}
          </h2>
          <ProvisionedTenantList records={records} showAddButton={false} />
        </section>
      </div>
    </AgentShell>
  );
}
