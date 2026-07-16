import {
  approveMaintenanceQuotation,
  assignPreferredMaintenanceContractor,
  declineMaintenanceQuotation,
  inviteMaintenanceContractorsForRfq,
  requestMaintenanceEvidence,
  setMaintenanceCompletionEvidence,
  setMaintenanceInvoiceUploaded,
  setMaintenanceResponsibility,
  setMaintenanceTenantApproval,
  transitionMaintenanceCase,
  type MaintenanceWorkflowResponsibility,
} from '@/lib/crossub-api/maintenance-client';

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
    await assignPreferredMaintenanceContractor(requestId, contractorIds[0]!);
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

/** @deprecated Use confirmMaintenanceResponsibility */
export async function assignMaintenanceResponsibility(
  requestId: string,
  responsibility: MaintenanceWorkflowResponsibility,
) {
  await confirmMaintenanceResponsibility(requestId, responsibility);
}
