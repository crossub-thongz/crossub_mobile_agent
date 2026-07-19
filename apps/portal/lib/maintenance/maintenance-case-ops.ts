import {
  approveMaintenanceQuotation,
  assignPreferredMaintenanceContractor,
  declineMaintenanceQuotation,
  inviteMaintenanceContractorsForRfq,
  requestMaintenanceEvidence,
  reviewMaintenanceQuotationDecision,
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
  },
) {
  await setMaintenanceResponsibility(requestId, responsibility, {
    ccEmails: options?.ccEmails,
  });

  if (responsibility === 'landlord') {
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
    await inviteMaintenanceContractorsForRfq(requestId, contractorIds);
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
    tenantApprovalReceived: true,
    invoiceUploaded: true,
  });
}

/** Close a job after completion gates are satisfied. */
export async function closeMaintenanceCase(requestId: string) {
  await transitionMaintenanceCase(requestId, 'closed', {
    completionEvidenceUploaded: true,
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

/** Approve via `/maintenance/quotations/*` — same workflow board as the admin portal. */
export async function approveMaintenanceQuotationCase(quotationId: string) {
  await approveMaintenanceQuotation(quotationId);
}

export async function declineMaintenanceQuotationCase(quotationId: string, reason: string) {
  await declineMaintenanceQuotation(quotationId, reason);
}

export async function reviewMaintenanceQuotationDecisionCase(
  quotationId: string,
  decision: 'approved' | 'declined',
  declineReason?: string,
  quotationSnapshot?: Parameters<typeof reviewMaintenanceQuotationDecision>[4],
) {
  await reviewMaintenanceQuotationDecision(
    quotationId,
    decision,
    declineReason,
    'agent',
    quotationSnapshot,
  );
}

export async function sendMaintenanceQuotationToLandlordCase(quotationId: string) {
  await sendMaintenanceQuotationToLandlord(quotationId);
}

export async function sendMaintenanceContractorFeedbackCase(
  quotationId: string,
  feedbackMessage?: string,
) {
  await sendMaintenanceContractorFeedback(quotationId, feedbackMessage);
}

export async function sendMaintenanceQuotationCounterOfferCase(
  quotationId: string,
  counterPrice: number,
  message?: string,
) {
  await sendMaintenanceQuotationCounterOffer(quotationId, counterPrice, message);
}

/** @deprecated Use confirmMaintenanceResponsibility */
export async function assignMaintenanceResponsibility(
  requestId: string,
  responsibility: MaintenanceWorkflowResponsibility,
) {
  await confirmMaintenanceResponsibility(requestId, responsibility);
}
