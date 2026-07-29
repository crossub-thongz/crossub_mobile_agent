import { api, ApiError } from '@/lib/api';
import type { AuthUser } from '@/lib/auth-types';

export interface RegisterAgentInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  agencyName: string;
  agencyCompany?: string;
  phone?: string;
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
): Promise<{ user: AuthUser; credentialsSent: boolean }> {
  return api.post(`/auth/register-agent-invite/${encodeURIComponent(token)}`, {
    acceptTerms,
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
