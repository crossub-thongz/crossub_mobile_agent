import type { AgentTenantAccount } from '@/lib/crossub-api/agent-client';
import type { ProvisionedTenant } from '@/lib/tenant-provisioning';

export interface ProvisionedTenantRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  /** Stored locally so agents can re-share credentials with the tenant. */
  password?: string;
  status: string;
  provisionedAt: string;
  applicationLabel?: string;
  selectionId?: string;
  propertyId?: string;
}

export function buildProvisionedTenantRecord(input: {
  provisioned: ProvisionedTenant;
  firstName: string;
  lastName: string;
  phone?: string;
  password?: string;
  applicationLabel?: string;
  selectionId?: string;
  propertyId?: string;
}): ProvisionedTenantRecord {
  const { provisioned } = input;
  return {
    id: provisioned.id,
    email: provisioned.email,
    firstName:
      typeof provisioned.firstName === 'string'
        ? provisioned.firstName
        : input.firstName,
    lastName:
      typeof provisioned.lastName === 'string'
        ? provisioned.lastName
        : input.lastName,
    phone: input.phone,
    password: input.password,
    status: provisioned.status,
    provisionedAt: new Date().toISOString(),
    applicationLabel: input.applicationLabel,
    selectionId: input.selectionId,
    propertyId: input.propertyId,
  };
}

/** Map a server tenant login (`GET /agent/tenants`) onto the local record shape. */
export function recordFromServerTenant(tenant: AgentTenantAccount): ProvisionedTenantRecord {
  return {
    id: tenant.id,
    email: tenant.email,
    firstName: tenant.firstName ?? '',
    lastName: tenant.lastName ?? '',
    phone: tenant.phone ?? undefined,
    status: tenant.status,
    provisionedAt: tenant.createdAt,
    applicationLabel: tenant.propertyAddress ?? undefined,
    propertyId: tenant.propertyId ?? undefined,
  };
}

/**
 * Merge the server tenant list with device-local provisioned records. The
 * server list is the source of truth for existence/status; local records
 * contribute the device-held password (never returned by the API) and any
 * rows the server cannot attribute yet (tenants provisioned without an
 * application are omitted server-side).
 */
export function mergeProvisionedTenantRecords(
  local: ProvisionedTenantRecord[],
  server: ProvisionedTenantRecord[],
): ProvisionedTenantRecord[] {
  const merged: ProvisionedTenantRecord[] = [];
  const seenIds = new Set<string>();
  const serverEmails = new Set(server.map((s) => s.email));

  for (const row of server) {
    const localMatch = local.find((l) => l.id === row.id || l.email === row.email);
    merged.push(
      localMatch
        ? {
            ...row,
            password: localMatch.password,
            selectionId: localMatch.selectionId,
            applicationLabel: row.applicationLabel ?? localMatch.applicationLabel,
          }
        : row,
    );
    seenIds.add(row.id);
    if (localMatch) seenIds.add(localMatch.id);
  }

  for (const row of local) {
    if (seenIds.has(row.id) || serverEmails.has(row.email)) continue;
    merged.push(row);
  }

  return merged;
}
