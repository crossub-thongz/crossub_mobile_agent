import { MAINTENANCE_CLOSE_REASON } from '@/constants/maintenance-close';
import {
  approveMaintenanceQuotation,
  assignPreferredMaintenanceContractor,
  closeMaintenanceCaseWithReason,
  declineMaintenanceQuotation,
  inviteMaintenanceContractorsForRfq,
  requestMaintenanceEvidence,
  sendMaintenanceContractorFeedback,
  sendMaintenanceQuotationCounterOffer,
  sendMaintenanceQuotationToLandlord,
  setMaintenanceCompletionEvidence,
  setMaintenanceInvoiceUploaded,
  setMaintenanceResponsibility,
  setMaintenanceTenantApproval,
  transitionMaintenanceCase,
  type MaintenanceWorkflowResponsibility,
} from '@/lib/crossub-api/maintenance-client';

/** Row id for `assign-contractor` when the selection key is agency-scoped. */
function preferredRowIdForAssign(selectionKey: string): string | null {
  const fromPref = /^agency-pref-(.+)$/.exec(selectionKey.trim());
  if (fromPref?.[1]) return fromPref[1];
  if (/^[0-9a-f-]{36}$/i.test(selectionKey.trim())) return selectionKey.trim();
  return null;
}

export async function confirmMaintenanceResponsibility(
  requestId: string,
  responsibility: MaintenanceWorkflowResponsibility,
  options?: {
    preferredContractorId?: string;
    preferredContractorIds?: string[];
    ccEmails?: string[];
    rfqMessage?: { subject: string; bodyText: string };
    previewContractorName?: string;
  },
) {
  const isLandlord = responsibility === 'landlord';
  await setMaintenanceResponsibility(requestId, responsibility, {
    ccEmails: options?.ccEmails,
    skipRecipientEmail: isLandlord,
  });

  if (isLandlord) {
    const contractorIds =
      options?.preferredContractorIds?.filter(Boolean) ??
      (options?.preferredContractorId ? [options.preferredContractorId] : []);
    if (contractorIds.length === 0) {
      throw new Error('Select at least one tradesman before confirming landlord responsibility.');
    }
    const assignRowId = preferredRowIdForAssign(contractorIds[0]!);
    if (assignRowId) {
      await assignPreferredMaintenanceContractor(requestId, assignRowId);
    }
    await inviteMaintenanceContractorsForRfq(requestId, contractorIds, {
      replaceExisting: true,
      rfqMessage: options?.rfqMessage,
      previewContractorName: options?.previewContractorName,
    });
    await transitionMaintenanceCase(requestId, 'pending_quotation');
  }
  // Tenant/strata: setResponsibility sends the email and the backend advances to in_progress.
}

export async function requestMoreMaintenanceEvidence(requestId: string) {
  await requestMaintenanceEvidence(requestId);
}

export async function markTenantStrataRepairComplete(requestId: string) {
  await transitionMaintenanceCase(requestId, 'closed');
}

/** Tenant-responsibility path: acknowledgement only — no evidence / invoice gates. */
export async function recordTenantAcknowledgementAndClose(requestId: string) {
  await setMaintenanceTenantApproval(requestId, true);
  await transitionMaintenanceCase(requestId, 'closed', {
    tenantApprovalReceived: true,
  });
}

/** All completion gates checked — advance to the completed step (matches admin portal). */
export async function confirmMaintenanceGatesComplete(requestId: string) {
  await transitionMaintenanceCase(requestId, 'completed', {
    completionEvidenceUploaded: true,
    agentApprovalReceived: true,
    tenantApprovalReceived: true,
    invoiceUploaded: true,
  });
}

/** Close a job after completion gates are satisfied. */
export async function closeMaintenanceCase(requestId: string) {
  await transitionMaintenanceCase(requestId, 'closed', {
    completionEvidenceUploaded: true,
    agentApprovalReceived: true,
    tenantApprovalReceived: true,
    invoiceUploaded: true,
  });
}

export async function confirmMaintenancePaymentAndClose(requestId: string) {
  await setMaintenanceInvoiceUploaded(requestId, true);
  await setMaintenanceTenantApproval(requestId, true);
  await transitionMaintenanceCase(requestId, 'closed', {
    invoiceUploaded: true,
    tenantApprovalReceived: true,
  });
}

export async function markMaintenanceWorkComplete(requestId: string) {
  await setMaintenanceCompletionEvidence(requestId, true);
  await transitionMaintenanceCase(requestId, 'completed', {
    completionEvidenceUploaded: true,
  });
}

/** Approve a specific submitted quote via the agent facade — the same workflow the staff run. */
export async function approveMaintenanceQuotationCase(requestId: string, quotationId: string) {
  await approveMaintenanceQuotation(requestId, quotationId);
}

export async function declineMaintenanceQuotationCase(
  requestId: string,
  quotationId: string,
  reason: string,
) {
  await declineMaintenanceQuotation(requestId, quotationId, reason);
}

/**
 * Record the agent's decision on a submitted quote through the facade. Approve and decline are
 * two distinct facade routes, so this fans out on the decision. The facade re-hydrates the job
 * server-side, so the old in-memory quotation snapshot is no longer threaded through.
 */
export async function reviewMaintenanceQuotationDecisionCase(
  requestId: string,
  quotationId: string,
  decision: 'approved' | 'declined',
  declineReason?: string,
) {
  if (decision === 'approved') {
    await approveMaintenanceQuotation(requestId, quotationId);
  } else {
    await declineMaintenanceQuotation(requestId, quotationId, declineReason ?? '');
  }
}

export async function sendMaintenanceQuotationToLandlordCase(
  quotationId: string,
  opts?: { skipRecipientEmail?: boolean },
) {
  await sendMaintenanceQuotationToLandlord(quotationId, 'agent', opts);
}

export async function sendMaintenanceContractorFeedbackCase(
  quotationId: string,
  feedbackMessage?: string,
) {
  await sendMaintenanceContractorFeedback(quotationId, feedbackMessage);
}

export async function sendMaintenanceQuotationCounterOfferCase(
  requestId: string,
  quotationId: string,
  counterPrice: number,
  message?: string,
) {
  await sendMaintenanceQuotationCounterOffer(requestId, quotationId, counterPrice, message);
}

/**
 * "Owner to Handle" — the owner arranges and manages the repair directly, so the job is closed
 * through the facade's manual-close path with the `HANDLED_BY_OWNER` reason. Distinct from the
 * per-quote decisions above: it settles the whole job rather than acting on a single quote. The
 * reason value is the contract enum (via the shared close constant), not a hand-typed literal.
 */
export async function handleMaintenanceByOwnerCase(requestId: string) {
  await closeMaintenanceCaseWithReason(requestId, {
    reason: MAINTENANCE_CLOSE_REASON.HANDLED_BY_OWNER,
  });
}

/** @deprecated Use confirmMaintenanceResponsibility */
export async function assignMaintenanceResponsibility(
  requestId: string,
  responsibility: MaintenanceWorkflowResponsibility,
) {
  await confirmMaintenanceResponsibility(requestId, responsibility);
}
