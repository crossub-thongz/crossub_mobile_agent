'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import {
  ProvisionTenantForm,
  ProvisionTenantSuccess,
  type ProvisionTenantSuccessPayload,
} from '@/components/agent/provision-tenant-form';
import { ProvisionedTenantList } from '@/components/agent/provisioned-tenant-list';
import { PageIntro } from '@/components/agent/page-intro';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ROUTES } from '@/constants/routes';
import { buildProvisionedTenantRecord } from '@/lib/provisioned-tenant-records';
import { resolveTenantProvisionPrefill } from '@/lib/tenant-provision-prefill';
import { useAgentStore } from '@/lib/store';
import { isUuid } from '@/lib/utils';

export default function AddTenantPage() {
  const searchParams = useSearchParams();
  const { tenantSelections } = useAgentData();
  const addProvisionedTenant = useAgentStore((s) => s.addProvisionedTenant);
  const provisionedTenants = useAgentStore((s) => s.provisionedTenants);
  const [success, setSuccess] = useState<ProvisionTenantSuccessPayload | null>(null);

  const selectionId = searchParams.get('selectionId') ?? undefined;
  const propertyId = searchParams.get('propertyId') ?? undefined;

  const prefill = useMemo(
    () =>
      resolveTenantProvisionPrefill({
        email: searchParams.get('email'),
        firstName: searchParams.get('firstName'),
        lastName: searchParams.get('lastName'),
        phone: searchParams.get('phone'),
        selectionId,
        propertyId,
        applicantId: searchParams.get('applicantId'),
        tenantSelections,
      }),
    [searchParams, selectionId, propertyId, tenantSelections],
  );

  const handleSuccess = (payload: ProvisionTenantSuccessPayload) => {
    addProvisionedTenant(
      buildProvisionedTenantRecord({
        provisioned: payload.provisioned,
        firstName: payload.credentials.firstName,
        lastName: payload.credentials.lastName,
        phone: payload.credentials.phone,
        password: payload.credentials.password,
        applicationLabel: prefill.applicationLabel,
        selectionId,
        propertyId,
      }),
    );
    setSuccess(payload);
  };

  return (
    <AgentShell title="Add tenant" backHref={ROUTES.TENANTS} backLabel="Tenant accounts">
      <div className="space-y-4 pb-8">

        <div className="rounded-xl border bg-card p-4">
          {success ? (
            <ProvisionTenantSuccess
              credentials={success.credentials}
              onCreateAnother={() => setSuccess(null)}
            />
          ) : (
            <ProvisionTenantForm
              prefill={prefill}
              applicationId={isUuid(selectionId) ? selectionId : undefined}
              onSuccess={handleSuccess}
            />
          )}
        </div>

        {!success && provisionedTenants.length > 0 ? (
          <section>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Recently created</h2>
              <Link href={ROUTES.TENANTS} className="text-primary text-xs font-medium">
                View all
              </Link>
            </div>
            <ProvisionedTenantList
              records={provisionedTenants.slice(0, 3)}
              showAddButton={false}
            />
          </section>
        ) : null}
      </div>
    </AgentShell>
  );
}
