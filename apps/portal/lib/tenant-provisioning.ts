import type { components } from '@crossub-thongz/api-contract';

import { crossub } from './crossub-api/client';

export type TenantProvisionInput = components['schemas']['ProvisionTenantDto'] & {
  applicationId?: string;
};
export type ProvisionedTenant =
  components['schemas']['ProvisionedTenantResponseDto'];

/**
 * Pull a human-readable message out of the Nest error envelope, which nests the real
 * message at `body.message.message` (a string, or a string[] for validation errors).
 */
function apiErrorMessage(body: unknown, fallback: string): string {
  const outer = (body as { message?: unknown } | null | undefined)?.message;
  const inner =
    (outer as { message?: unknown } | null | undefined)?.message ?? outer;
  if (Array.isArray(inner)) {
    const joined = inner
      .filter((m): m is string => typeof m === 'string')
      .join(', ');
    return joined || fallback;
  }
  return typeof inner === 'string' && inner ? inner : fallback;
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
  const { data, error, response } = await crossub.POST('/agent/tenants', {
    body: input,
  });
  if (error || !data) {
    throw new Error(
      apiErrorMessage(error, `Tenant provisioning failed (${response.status})`),
    );
  }
  return data;
}
