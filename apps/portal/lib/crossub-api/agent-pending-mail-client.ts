import { unwrapCrossubResult } from '@/lib/utils/unwrap-crossub-result';

import { crossub } from './client';

/**
 * Self-Manage pending mail on the agent facade. Same table as staff Accounting, limited to this
 * agency's bank account. Sending leaves from the agency address.
 */

export const AGENT_PENDING_MAIL_KIND = {
  TENANT_RECEIPT: 'TENANT_RECEIPT',
  OWNER_STATEMENT: 'OWNER_STATEMENT',
} as const;
export type AgentPendingMailKind = (typeof AGENT_PENDING_MAIL_KIND)[keyof typeof AGENT_PENDING_MAIL_KIND];

export const AGENT_PENDING_MAIL_STATUS = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
} as const;
export type AgentPendingMailStatus = (typeof AGENT_PENDING_MAIL_STATUS)[keyof typeof AGENT_PENDING_MAIL_STATUS];

export type AgentPendingMail = {
  id: string;
  kind: AgentPendingMailKind;
  status: AgentPendingMailStatus;
  sourceId: string;
  recipientEmail: string | null;
  recipientName: string | null;
  subject: string;
  summary: string;
  documentLabel: string;
  failureReason: string | null;
  sentAt: string | null;
  createdAt: string;
};

export type AgentPendingMailList = {
  items: AgentPendingMail[];
  total: number;
  page: number;
  pageSize: number;
  pendingCount: number;
};

export async function fetchAgentPendingMail(
  agencyId: string,
  bankAccountId: string,
  query: { status?: AgentPendingMailStatus; page?: number; pageSize?: number } = {},
): Promise<AgentPendingMailList> {
  const result = await crossub.GET(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/pending-mails',
    { params: { path: { agencyId, bankAccountId }, query } },
  );
  return unwrapCrossubResult(result, "Couldn't load pending mail") as AgentPendingMailList;
}

export async function downloadAgentPendingMailPdf(
  agencyId: string,
  bankAccountId: string,
  id: string,
): Promise<Blob> {
  const result = await crossub.GET(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/pending-mails/{id}/pdf',
    { params: { path: { agencyId, bankAccountId, id } }, parseAs: 'blob' },
  );
  return unwrapCrossubResult(result, "Couldn't download the document") as Blob;
}

export async function sendAgentPendingMail(
  agencyId: string,
  bankAccountId: string,
  id: string,
): Promise<AgentPendingMail> {
  const result = await crossub.POST(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/pending-mails/{id}/send',
    { params: { path: { agencyId, bankAccountId, id } } },
  );
  return unwrapCrossubResult(result, "Couldn't send the email") as AgentPendingMail;
}
