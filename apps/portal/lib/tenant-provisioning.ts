export interface TenantProvisionInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface TenantProvisionResult {
  email: string;
  firstName: string;
  lastName: string;
}

const tenantAppBase = (): string =>
  process.env.NEXT_PUBLIC_TENANT_APP_URL ?? 'http://localhost:3003';

/** Provisions a tenant account via the Tenant App API (Agent PC Portal → Tenant App). */
export async function provisionTenantAccount(
  input: TenantProvisionInput,
): Promise<TenantProvisionResult> {
  const res = await fetch(`${tenantAppBase()}/api/tenant-accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `Tenant provisioning failed (${res.status})`);
  }

  return res.json() as Promise<TenantProvisionResult>;
}
