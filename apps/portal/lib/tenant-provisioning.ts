import type { components } from '@crossub-thongz/api-contract';

import { crossub } from './crossub-api/client';
import { isUuid } from './utils';

export type TenantProvisionInput = components['schemas']['ProvisionTenantDto'] & {
  applicationId?: string;
};
export type ProvisionedTenant =
  components['schemas']['ProvisionedTenantResponseDto'];

/**
 * Pull a human-readable message out of the Nest error envelope, which nests the real
 * message at `body.message.message` (a string, or a string[] for validation errors).
 */
function apiErrorMessage(body: unknown, status: number, fallback: string): string {
  const parsed = body as { message?: unknown } | null | undefined;
  const outer = parsed?.message;
  const inner =
    (outer as { message?: unknown } | null | undefined)?.message ?? outer;
  if (Array.isArray(inner)) {
    const joined = inner
      .filter((m): m is string => typeof m === 'string')
      .join(', ');
    if (joined) return joined;
  }
  if (typeof inner === 'string' && inner) return inner;
  if (status === 403) {
    return 'Insufficient role — sign in as an Account Manager (ACCOUNT_MANAGER), not Super Admin or a local Register account.';
  }
  if (status === 401) {
    return 'Not signed in to the API — sign out and sign in with your CROSSUB Account Manager credentials.';
  }
  return fallback;
}

/**
 * Provisions a tenant login via the CROSSUB API (`POST /api/v1/agent/tenants`) using the
 * typed `@crossub-thongz/api-contract` client, through this app's same-origin proxy with
 * the signed-in Account Manager's session cookie. The API creates a real TENANT User
 * (Argon2-hashed password); there is no separate tenant-app account backend.
 */
export async function provisionTenantAccount(
  input: TenantProvisionInput,
): Promise<ProvisionedTenant> {
  const body: TenantProvisionInput = { ...input };
  if (body.applicationId && !isUuid(body.applicationId)) {
    delete body.applicationId;
  }

  try {
    const { data, error, response } = await crossub.POST('/agent/tenants', {
      body,
    });
    if (error || !data) {
      throw new Error(
        apiErrorMessage(error, response.status, `Tenant provisioning failed (${response.status})`),
      );
    }
    return data;
  } catch (e) {
    const message = e instanceof Error ? e.message : '';
    if (e instanceof SyntaxError || message.includes('JSON')) {
      throw new Error(
        'Invalid response from API — redeploy the agent portal (BFF proxy gzip fix) and try again.',
      );
    }
    throw e;
  }
}
