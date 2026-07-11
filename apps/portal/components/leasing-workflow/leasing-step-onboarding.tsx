'use client';

import { useEffect, useState } from 'react';
import {
  Banknote,
  ClipboardCheck,
  FileSignature,
  KeyRound,
  Landmark,
  Paperclip,
} from 'lucide-react';
import { toast } from 'sonner';

import { BoolStatus, StepCard, StepFact } from '@/components/leasing-workflow/leasing-step-kit';
import { LeasingContractDialog } from '@/components/leasing-workflow/leasing-contract-dialog';
import { LeasingIngoingNextStepPanel } from '@/components/leasing-workflow/leasing-ingoing-next-step';
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
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

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

function ProofLine({ fileName }: { fileName?: string }) {
  if (!fileName) return null;
  return (
    <span className="border-border bg-secondary/30 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px]">
      <Paperclip className="text-muted-foreground size-3" />
      {fileName}
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
  const bondIdLabel =
    formatBondIdForDisplay(
      o.bond.lodgementRef,
      o.bond.agentLink ? extractBondReferenceFromLink(o.bond.agentLink) : null,
    ) ?? null;

  const recordSigning = async () => {
    setRecordingSigning(true);
    try {
      if (apiConnected && cycleId) {
        const view = await leasingOpsApi.recordSigning(cycleId);
        store.applyCycleView(id, view);
      } else {
        store.recordSigning(id);
      }
      toast.success('Signing recorded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not record signing');
    } finally {
      setRecordingSigning(false);
    }
  };

  return (
    <div className="space-y-3">
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
        <ProofLine fileName={o.deposit.proofFileName} />
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
        <ProofLine fileName={o.bond.proofFileName} />
      </StepCard>

      <StepCard
        icon={FileSignature}
        title="Agreement"
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
                {o.agreement.signingStatus === 'signed' ? 'View agreement' : 'View agreement'}
              </Button>
              {o.agreement.signingStatus !== 'signed' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  disabled={recordingSigning}
                  onClick={() => void recordSigning()}
                >
                  {recordingSigning ? 'Recording…' : 'Record signing'}
                </Button>
              )}
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
        <div className="mt-2">
          <ProofLine fileName={o.agreement.uploadedFileName} />
        </div>
      </StepCard>

      <StepCard
        icon={KeyRound}
        title="Key collection"
        description={
          keyByCrossub
            ? 'CROSSUB manages keys — time and location are confirmed by CROSSUB.'
            : 'Agent manages keys — time and location are confirmed by the agency.'
        }
        status={o.keyCollection.status}
      >
        <div className="grid grid-cols-2 gap-3">
          <StepFact
            label="Time"
            value={o.keyCollection.time ? formatDateTime(o.keyCollection.time) : 'TBD'}
          />
          <StepFact label="Location" value={o.keyCollection.location ?? 'TBD'} />
          <StepFact
            label="Custody"
            value={LEASING_KEY_CUSTODY_LABEL[detail.agentInfo.keyCustody]}
            className="col-span-2"
          />
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
