import { ApiError, api } from './api';

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

/**
 * Provisions a tenant login via the CROSSUB API (POST /api/v1/agent/tenants), through
 * this app's own same-origin proxy carrying the signed-in Account Manager's session
 * cookie. The API creates a real TENANT User (Argon2-hashed password) the tenant signs
 * in with on the Tenant App — there is no separate tenant-app account backend.
 */
export async function provisionTenantAccount(
  input: TenantProvisionInput,
): Promise<TenantProvisionResult> {
  try {
    return await api.post<TenantProvisionResult>('/v1/agent/tenants', input);
  } catch (e) {
    if (e instanceof ApiError) {
      const message = (e.body as { message?: string } | null)?.message;
      throw new Error(message ?? `Tenant provisioning failed (${e.status})`);
    }
    throw e;
  }
}
