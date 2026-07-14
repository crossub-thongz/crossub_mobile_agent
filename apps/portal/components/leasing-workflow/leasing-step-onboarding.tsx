'use client';

import { useEffect, useState } from 'react';
import {
  Banknote,
  ClipboardCheck,
  FileDown,
  FileSignature,
  KeyRound,
  Landmark,
  Paperclip,
} from 'lucide-react';
import { toast } from 'sonner';

import { BoolStatus, StepCard, StepFact } from '@/components/leasing-workflow/leasing-step-kit';
import { LeasingContractDialog } from '@/components/leasing-workflow/leasing-contract-dialog';
import { LeasingIngoingNextStepPanel } from '@/components/leasing-workflow/leasing-ingoing-next-step';
import { LeasingKeyCollectionEvidencePanel } from '@/components/leasing-workflow/leasing-key-collection-evidence';
import { LeasingKeyCollectionSchedule } from '@/components/leasing-workflow/leasing-key-collection-schedule';
import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  LEASING_ITEM_STATUS,
  LEASING_KEY_CUSTODY,
  LEASING_KEY_CUSTODY_LABEL,
} from '@/lib/leasing/constants';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import type { LeasingAgreementState, LeasingPropertyDetail } from '@/lib/leasing/types';
import { leasingOpsApi } from '@/lib/leasing-ops-api';
import { LEASING_ONBOARDING_BOND_SECTION_ID } from '@/lib/property-leasing-navigation';
import { extractBondReferenceFromLink, formatBondIdForDisplay } from '@/lib/property-overview';
import { formatCurrency, formatDate, formatDateTime, formatOpenInspectionWindow } from '@/lib/utils';

const SIGNING_LABEL: Record<LeasingAgreementState['signingStatus'], string> = {
  not_sent: 'Not sent',
  sent: 'Sent',
  viewed: 'Viewed',
  signed: 'Signed',
};

function agreementAvailableFromCrossub(agreement: LeasingAgreementState): boolean {
  return (
    agreement.signingStatus !== 'not_sent' ||
    Boolean(agreement.uploadedFileName) ||
    agreement.status !== LEASING_ITEM_STATUS.NOT_STARTED
  );
}

function hasPendingProof(proof?: { proofFileName?: string; proofUrl?: string }): boolean {
  return Boolean(proof?.proofFileName?.trim() || proof?.proofUrl?.trim());
}

function OnboardingReviewActions({
  approving,
  rejecting,
  onApprove,
  onReject,
  approveLabel = 'Approve',
  rejectLabel = 'Reject',
}: {
  approving: boolean;
  rejecting: boolean;
  onApprove: () => void;
  onReject: () => void;
  approveLabel?: string;
  rejectLabel?: string;
}) {
  return (
    <div className="flex gap-2">
      <Button
        type="button"
        size="sm"
        className="h-8 flex-1 text-xs"
        disabled={approving || rejecting}
        onClick={onApprove}
      >
        {approving ? 'Approving…' : approveLabel}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 flex-1 text-xs"
        disabled={approving || rejecting}
        onClick={onReject}
      >
        {rejecting ? 'Rejecting…' : rejectLabel}
      </Button>
    </div>
  );
}

function ProofLine({
  fileName,
  proofUrl,
  label = 'View attachment',
}: {
  fileName?: string;
  proofUrl?: string;
  label?: string;
}) {
  if (!fileName && !proofUrl) return null;
  const displayName = fileName ?? 'Proof document';
  if (proofUrl) {
    return (
      <a
        href={proofUrl}
        target="_blank"
        rel="noopener noreferrer"
        download={fileName}
        className="border-border bg-secondary/30 text-primary inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium underline"
      >
        <Paperclip className="text-muted-foreground size-3" />
        {displayName}
      </a>
    );
  }
  return (
    <span className="border-border bg-secondary/30 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px]">
      <Paperclip className="text-muted-foreground size-3" />
      {displayName}
      <span className="text-muted-foreground">· {label} pending</span>
    </span>
  );
}

export function LeasingStepOnboarding({ detail }: { detail: LeasingPropertyDetail }) {
  const id = detail.propertyId;
  const o = detail.onboarding;
  const store = useLeasingWorkflowStore();
  const bondHighlightPropertyId = useLeasingWorkflowStore((s) => s.bondHighlightPropertyId);
  const clearBondSectionHighlight = useLeasingWorkflowStore((s) => s.clearBondSectionHighlight);
  const { leasingCycles, apiConnected } = useAgentData();
  const [recordingSigning, setRecordingSigning] = useState(false);
  const [confirmingDeposit, setConfirmingDeposit] = useState(false);
  const [rejectingDeposit, setRejectingDeposit] = useState(false);
  const [confirmingBond, setConfirmingBond] = useState(false);
  const [rejectingBond, setRejectingBond] = useState(false);
  const [rejectingAgreement, setRejectingAgreement] = useState(false);
  const [downloadingAgreement, setDownloadingAgreement] = useState(false);
  const highlightBond = bondHighlightPropertyId === id;

  useEffect(() => {
    if (!highlightBond) return;
    const el = document.getElementById(LEASING_ONBOARDING_BOND_SECTION_ID);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timer = window.setTimeout(() => clearBondSectionHighlight(), 4000);
    return () => window.clearTimeout(timer);
  }, [highlightBond, clearBondSectionHighlight]);

  const cycleId = leasingCycles.find((c) => c.propertyId === id)?.id;
  const agreementReady = agreementAvailableFromCrossub(o.agreement);
  const keyByCrossub = detail.agentInfo.keyCustody === LEASING_KEY_CUSTODY.CROSSUB;
  const propertyLabel = detail.propertyAddress;
  const bondIdLabel =
    formatBondIdForDisplay(
      o.bond.lodgementRef,
      o.bond.agentLink ? extractBondReferenceFromLink(o.bond.agentLink) : null,
    ) ?? null;

  const depositPendingConfirm =
    o.deposit.status === LEASING_ITEM_STATUS.WAITING && hasPendingProof(o.deposit);
  const bondPendingConfirm =
    o.bond.status === LEASING_ITEM_STATUS.WAITING && hasPendingProof(o.bond);
  const agreementPendingConfirm =
    o.agreement.status === LEASING_ITEM_STATUS.WAITING &&
    o.agreement.signingStatus !== 'signed';

  const confirmDeposit = async () => {
    setConfirmingDeposit(true);
    try {
      if (apiConnected && cycleId) {
        const view = await leasingOpsApi.approveDepositProof(cycleId);
        store.applyCycleView(id, view);
      } else {
        store.markDepositPaid(id);
      }
      toast.success('Deposit approved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not approve deposit');
    } finally {
      setConfirmingDeposit(false);
    }
  };

  const rejectDeposit = async () => {
    setRejectingDeposit(true);
    try {
      if (apiConnected && cycleId) {
        const view = await leasingOpsApi.rejectDepositProof(cycleId);
        store.applyCycleView(id, view);
      } else {
        store.rejectDepositProof(id);
      }
      toast.success('Deposit proof rejected — tenant can re-upload');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reject deposit');
    } finally {
      setRejectingDeposit(false);
    }
  };

  const confirmBond = async () => {
    setConfirmingBond(true);
    try {
      if (apiConnected && cycleId) {
        const view = await leasingOpsApi.approveBondProof(cycleId);
        store.applyCycleView(id, view);
      } else {
        store.markBondPaid(id);
      }
      toast.success('Bond approved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not approve bond');
    } finally {
      setConfirmingBond(false);
    }
  };

  const rejectBond = async () => {
    setRejectingBond(true);
    try {
      if (apiConnected && cycleId) {
        const view = await leasingOpsApi.rejectBondProof(cycleId);
        store.applyCycleView(id, view);
      } else {
        store.rejectBondProof(id);
      }
      toast.success('Bond proof rejected — tenant can re-upload');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reject bond');
    } finally {
      setRejectingBond(false);
    }
  };

  const recordSigning = async () => {
    setRecordingSigning(true);
    try {
      if (apiConnected && cycleId) {
        const view = await leasingOpsApi.recordSigning(cycleId);
        store.applyCycleView(id, view);
      } else {
        store.recordSigning(id);
      }
      toast.success('Agreement approved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not record signing');
    } finally {
      setRecordingSigning(false);
    }
  };

  const rejectAgreement = async () => {
    setRejectingAgreement(true);
    try {
      if (apiConnected && cycleId) {
        const view = await leasingOpsApi.rejectAgreementSigning(cycleId);
        store.applyCycleView(id, view);
      } else {
        store.rejectAgreementSigning(id);
      }
      toast.success('Agreement rejected — tenant can sign and submit again');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reject agreement');
    } finally {
      setRejectingAgreement(false);
    }
  };

  const downloadAgreement = async () => {
    if (!cycleId) {
      toast.error('Agreement PDF is not available offline');
      return;
    }
    setDownloadingAgreement(true);
    try {
      const blob = await leasingOpsApi.downloadAgreementPdf(cycleId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${o.agreement.contract.contractId || 'agreement'}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success('Agreement downloaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not download agreement');
    } finally {
      setDownloadingAgreement(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs leading-relaxed">
        Tenant onboarding — review proofs uploaded by the tenant and send key collection details.
      </p>

      <StepCard icon={Banknote} title="Deposit paid" status={o.deposit.status}>
        <div className="grid grid-cols-2 gap-3">
          <StepFact
            label="Amount"
            value={o.deposit.amount ? formatCurrency(o.deposit.amount) : '—'}
          />
          <StepFact
            label="Paid"
            value={o.deposit.paidAt ? formatDate(o.deposit.paidAt) : 'Not paid'}
          />
        </div>
        <div className="mt-2 space-y-2">
          <ProofLine fileName={o.deposit.proofFileName} proofUrl={o.deposit.proofUrl} />
          {depositPendingConfirm ? (
            <OnboardingReviewActions
              approving={confirmingDeposit}
              rejecting={rejectingDeposit}
              onApprove={() => void confirmDeposit()}
              onReject={() => void rejectDeposit()}
              approveLabel="Approve deposit"
              rejectLabel="Reject"
            />
          ) : null}
        </div>
      </StepCard>

      <StepCard
        icon={Landmark}
        id={LEASING_ONBOARDING_BOND_SECTION_ID}
        highlighted={highlightBond}
        title="Bond"
        description="Bond link is sent to the tenant on approval — status updates from CROSSUB."
        status={o.bond.status}
      >
        <div className="grid grid-cols-2 gap-3">
          <StepFact label="Amount" value={o.bond.amount ? formatCurrency(o.bond.amount) : '—'} />
          <StepFact
            label="Paid"
            value={o.bond.paidAt ? formatDate(o.bond.paidAt) : 'Not paid'}
          />
          {bondIdLabel ? (
            <StepFact label="Bond ID" value={bondIdLabel} className="col-span-2" />
          ) : null}
          {o.bond.sentToTenantAt ? (
            <StepFact
              label="Link sent"
              value={formatDateTime(o.bond.sentToTenantAt)}
              className="col-span-2"
            />
          ) : null}
        </div>
        <div className="mt-2 space-y-2">
          <ProofLine fileName={o.bond.proofFileName} proofUrl={o.bond.proofUrl} />
          {bondPendingConfirm ? (
            <OnboardingReviewActions
              approving={confirmingBond}
              rejecting={rejectingBond}
              onApprove={() => void confirmBond()}
              onReject={() => void rejectBond()}
              approveLabel="Approve bond"
              rejectLabel="Reject"
            />
          ) : null}
        </div>
      </StepCard>

      <StepCard
        icon={FileSignature}
        title="Lease agreement"
        description={
          o.agreement.signingStatus === 'signed'
            ? 'Agreement signed — terms are locked.'
            : agreementReady
              ? 'Agreement sent from CROSSUB — review and record signing when complete.'
              : 'CROSSUB will generate and send the agreement after onboarding items are complete.'
        }
        status={o.agreement.status}
        footer={
          agreementReady ? (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => store.setContractDialogOpen(true)}
              >
                View agreement
              </Button>
              {apiConnected && cycleId && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 text-xs"
                  disabled={downloadingAgreement}
                  onClick={() => void downloadAgreement()}
                >
                  <FileDown className="size-3" />
                  {downloadingAgreement ? 'Downloading…' : 'Download PDF'}
                </Button>
              )}
              {agreementPendingConfirm ? (
                <OnboardingReviewActions
                  approving={recordingSigning}
                  rejecting={rejectingAgreement}
                  onApprove={() => void recordSigning()}
                  onReject={() => void rejectAgreement()}
                  approveLabel="Approve agreement"
                  rejectLabel="Reject"
                />
              ) : null}
              {o.agreement.signingStatus !== 'signed' && !agreementPendingConfirm ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  disabled={recordingSigning}
                  onClick={() => void recordSigning()}
                >
                  {recordingSigning ? 'Recording…' : 'Record signing'}
                </Button>
              ) : null}
            </>
          ) : undefined
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <StepFact label="Template" value={o.agreement.contract.template} />
          <StepFact label="Term" value={o.agreement.contract.leaseTerm} />
          <StepFact
            label="Rent"
            value={
              o.agreement.contract.weeklyRent
                ? `${formatCurrency(o.agreement.contract.weeklyRent)}/wk`
                : '—'
            }
          />
          <StepFact label="Signing" value={SIGNING_LABEL[o.agreement.signingStatus]} />
        </div>
        <div className="mt-2 space-y-2">
          <ProofLine
            fileName={o.agreement.uploadedFileName}
            label="Uploaded agreement"
          />
        </div>
      </StepCard>

      <StepCard
        icon={KeyRound}
        title="Key collection"
        description={
          keyByCrossub
            ? 'CROSSUB manages keys — confirm time and location for the tenant.'
            : 'Agent manages keys — confirm time and location for the tenant.'
        }
        status={o.keyCollection.status}
      >
        <div className="grid grid-cols-2 gap-3">
          <StepFact
            label="Time"
            value={
              o.keyCollection.time
                ? formatOpenInspectionWindow(
                    o.keyCollection.time,
                    o.keyCollection.timeEnd,
                  ) ?? formatDateTime(o.keyCollection.time)
                : 'Not set'
            }
          />
          <StepFact label="Location" value={o.keyCollection.location ?? 'Not set'} />
          <StepFact
            label="Custody"
            value={LEASING_KEY_CUSTODY_LABEL[detail.agentInfo.keyCustody]}
            className="col-span-2"
          />
          <LeasingKeyCollectionEvidencePanel
            keyCollection={o.keyCollection}
            propertyLabel={propertyLabel}
          />
        </div>
        <div className="mt-3">
          <LeasingKeyCollectionSchedule detail={detail} cycleId={cycleId} />
        </div>
      </StepCard>

      <StepCard
        icon={ClipboardCheck}
        title="Ingoing report approval"
        status={o.ingoingReportApproval.status}
      >
        <BoolStatus
          done={o.ingoingReportApproval.tenantApproved}
          doneLabel="Tenant approved ingoing report"
          pendingLabel="Awaiting tenant approval"
        />
      </StepCard>

      <LeasingIngoingNextStepPanel detail={detail} />

      <LeasingContractDialog detail={detail} readOnly cycleId={cycleId} apiConnected={apiConnected} />
    </div>
  );
}
