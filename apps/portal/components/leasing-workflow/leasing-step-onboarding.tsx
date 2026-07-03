'use client';

import {
  Banknote,
  ClipboardCheck,
  FileSignature,
  KeyRound,
  Landmark,
} from 'lucide-react';
import { toast } from 'sonner';

import { BoolStatus, StepCard, StepFact } from '@/components/leasing-workflow/leasing-step-kit';
import { KeyCollectionForm } from '@/components/agent/key-collection-form';
import { Button } from '@/components/ui/button';
import { LEASING_ITEM_STATUS, LEASING_KEY_CUSTODY } from '@/lib/leasing/constants';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

export function LeasingStepOnboarding({ detail }: { detail: LeasingPropertyDetail }) {
  const id = detail.propertyId;
  const o = detail.onboarding;
  const store = useLeasingWorkflowStore();

  return (
    <div className="space-y-3">
      <StepCard
        icon={Banknote}
        title="Deposit paid"
        status={o.deposit.status}
        footer={
          o.deposit.status !== LEASING_ITEM_STATUS.DONE ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => {
                store.markDepositPaid(id);
                toast.success('Deposit marked paid');
              }}
            >
              Mark deposit paid
            </Button>
          ) : undefined
        }
      >
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
      </StepCard>

      <StepCard
        icon={Landmark}
        title="Bond"
        description="Bond link sent to the tenant on approval."
        status={o.bond.status}
        footer={
          <>
            {!o.bond.agentLink && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => {
                  store.setBondLink(id, `https://rtba.qld.gov.au/bond/${id}`);
                  toast.success('Bond link sent to tenant');
                }}
              >
                Send bond link
              </Button>
            )}
            {o.bond.agentLink && o.bond.status !== LEASING_ITEM_STATUS.DONE && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => {
                  store.markBondPaid(id);
                  toast.success('Bond marked paid');
                }}
              >
                Mark bond paid
              </Button>
            )}
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <StepFact label="Amount" value={o.bond.amount ? formatCurrency(o.bond.amount) : '—'} />
          <StepFact
            label="Status"
            value={o.bond.paidAt ? `Paid ${formatDate(o.bond.paidAt)}` : o.bond.agentLink ? 'Link sent' : 'Pending'}
          />
        </div>
      </StepCard>

      <StepCard
        icon={FileSignature}
        title="Agreement"
        status={o.agreement.status}
        footer={
          <>
            {!o.agreement.contract.confirmed && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => {
                  store.confirmContract(id);
                  toast.success('Contract confirmed');
                }}
              >
                Confirm contract
              </Button>
            )}
            {o.agreement.signingStatus !== 'signed' && o.agreement.contract.confirmed && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => {
                  store.recordSigning(id);
                  toast.success('Agreement signed');
                }}
              >
                Record signing
              </Button>
            )}
          </>
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
          <StepFact label="Signing" value={o.agreement.signingStatus.replace('_', ' ')} />
        </div>
      </StepCard>

      <StepCard
        icon={KeyRound}
        title="Key collection"
        status={o.keyCollection.status}
        footer={
          o.keyCollection.status !== LEASING_ITEM_STATUS.DONE ? (
            <KeyCollectionForm
              propertyId={id}
              onScheduled={(time, location) => {
                store.setKeyCollection(id, time, location);
              }}
              onKeyCollectionUpdated={(kc) => {
                store.applyKeyCollectionFromApi(id, kc);
              }}
            />
          ) : undefined
        }
      >
        <StepFact
          label="Custody"
          value={
            o.keyCollection.custody === LEASING_KEY_CUSTODY.CROSSUB
              ? 'CROSSUB manages keys'
              : 'Agent manages keys'
          }
        />
        {o.keyCollection.time && (
          <StepFact label="Time" value={formatDateTime(o.keyCollection.time)} className="mt-2" />
        )}
        {o.keyCollection.location && (
          <StepFact label="Location" value={o.keyCollection.location} className="mt-2" />
        )}
      </StepCard>

      <StepCard
        icon={ClipboardCheck}
        title="Ingoing inspection"
        status={o.ingoingInspection.status}
        footer={
          <>
            {!o.ingoingInspection.scheduledTime && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => {
                  store.scheduleIngoingInspection(id, new Date().toISOString(), 'Lisa Tran');
                  toast.success('Ingoing inspection scheduled');
                }}
              >
                Schedule ingoing inspection
              </Button>
            )}
            {o.ingoingInspection.scheduledTime && !o.ingoingInspection.tenantConfirmed && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => {
                  store.tenantConfirmIngoing(id);
                  toast.success('Tenant confirmed ingoing inspection');
                }}
              >
                Tenant confirmed
              </Button>
            )}
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <StepFact label="Assignee" value={o.ingoingInspection.assignee ?? '—'} />
          <BoolStatus
            done={o.ingoingInspection.tenantConfirmed}
            doneLabel="Tenant confirmed"
            pendingLabel="Awaiting tenant confirmation"
          />
        </div>
      </StepCard>

      <StepCard
        icon={ClipboardCheck}
        title="Ingoing report approval"
        status={o.ingoingReportApproval.status}
        footer={
          !o.ingoingReportApproval.tenantApproved ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => {
                store.tenantApproveIngoingReport(id);
                toast.success('Ingoing report approved');
              }}
            >
              Record tenant approval
            </Button>
          ) : undefined
        }
      >
        <BoolStatus
          done={o.ingoingReportApproval.tenantApproved}
          doneLabel="Tenant approved ingoing report"
          pendingLabel="Awaiting tenant approval"
        />
      </StepCard>
    </div>
  );
}
