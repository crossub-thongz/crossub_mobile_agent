import { api, ApiError } from '@/lib/api';
import type { AuthUser } from '@/lib/auth-types';
import type { AgentPortalServiceLevel } from '@/lib/portal-service-level';
import type { AgentBillingPricingCatalog } from '@/lib/crossub-api/agent-billing-client';

export interface RegisterAgentInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  agencyName: string;
  agencyCompany?: string;
  phone?: string;
  abn?: string;
  licenceNumber: string;
  officeAddress?: string;
  portalServiceLevel: AgentPortalServiceLevel;
  acceptTerms: boolean;
}

/** Default NSW service agreement template for Full Service registration. */
export const REGISTER_SERVICE_AGREEMENT_TEMPLATE_PATH =
  '/auth/register-agent-service-agreement-template';

export const REGISTER_SERVICE_AGREEMENT_FALLBACK = {
  title: 'CROSSUB Service Agreement (NSW)',
  fileName: 'CROSSUB Service Agreement NSW.pdf',
} as const;

/** Agency system access agreement for the registration confirm step (public, no auth). */
export const REGISTER_SYSTEM_ACCESS_AGREEMENT_PATH =
  '/auth/register-agent-system-access-agreement';

export const REGISTER_SYSTEM_ACCESS_AGREEMENT_DOCUMENT_PATH =
  '/auth/register-agent-system-access-agreement/document';

/** Shown on the confirm step when metadata cannot be loaded from the API. */
export const REGISTER_SYSTEM_ACCESS_AGREEMENT_FALLBACK = {
  title: 'CROSSUB Service Agreement (NSW)',
  fileName: 'CROSSUB Service Agreement NSW.pdf',
  version: 'nsw-service-agreement-2026-09',
} as const;

/** Default platform pricing for the registration flow (public, no auth). */
export async function fetchRegisterAgentPricing(): Promise<
  Omit<AgentBillingPricingCatalog, 'portalServiceLevel'>
> {
  return api.get('/auth/register-agent-pricing');
}

/** Register via the shared API — creates User + Agency + assignment in crossub_web. */
export async function registerAgentAccount(
  input: RegisterAgentInput,
): Promise<AuthUser> {
  const result = await api.post<{ user: AuthUser }>('/auth/register-agent', {
    email: input.email.trim(),
    password: input.password,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    agencyName: input.agencyName.trim(),
    agencyCompany: input.agencyCompany?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    abn: input.abn?.trim() || undefined,
    licenceNumber: input.licenceNumber.trim(),
    officeAddress: input.officeAddress?.trim() || undefined,
    portalServiceLevel: input.portalServiceLevel,
    acceptTerms: input.acceptTerms,
  });
  return result.user;
}

export function registerAgentErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { message?: string | string[] } | undefined;
    if (typeof body?.message === 'string') return body.message;
    if (Array.isArray(body?.message)) return body.message.join(', ');
    if (err.status === 409) return 'Email or agency name already exists.';
    if (err.status === 0) return 'Cannot reach the CROSSUB API.';
    return `Registration failed (${err.status}).`;
  }
  if (err instanceof Error) return err.message;
  return 'Registration failed.';
}

export interface AgentInvitePreview {
  email: string;
  agencyName: string;
  contactName: string | null;
  expired: boolean;
  used: boolean;
  requiresServiceLevel?: boolean;
  portalServiceLevel?: AgentPortalServiceLevel | null;
}

export async function fetchAgentInvitePreview(token: string): Promise<AgentInvitePreview> {
  const result = await api.get<{ invite: AgentInvitePreview }>(
    `/auth/register-agent-invite/${encodeURIComponent(token)}`,
  );
  return result.invite;
}

export async function completeAgentInviteRegistration(
  token: string,
  acceptTerms: boolean,
  portalServiceLevel: AgentPortalServiceLevel,
): Promise<{ user: AuthUser; credentialsSent: boolean }> {
  return api.post(`/auth/register-agent-invite/${encodeURIComponent(token)}`, {
    acceptTerms,
    portalServiceLevel,
  });
}

export async function fetchAgencyAgentInvitePreview(
  token: string,
): Promise<AgentInvitePreview> {
  const result = await api.get<{ invite: AgentInvitePreview }>(
    `/auth/register-agency-agent-invite/${encodeURIComponent(token)}`,
  );
  return result.invite;
}

export async function completeAgencyAgentInviteRegistration(
  token: string,
  acceptTerms: boolean,
): Promise<{ user: AuthUser; credentialsSent: boolean }> {
  return api.post(`/auth/register-agency-agent-invite/${encodeURIComponent(token)}`, {
    acceptTerms,
  });
}
