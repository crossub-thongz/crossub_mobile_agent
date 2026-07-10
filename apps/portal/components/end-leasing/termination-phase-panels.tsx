'use client';

import { useRouter } from 'next/navigation';
import {
  ClipboardCheck,
  ExternalLink,
  FileText,
  KeyRound,
  Landmark,
  Receipt,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { BoolStatus, StepCard, StepFact } from '@/components/leasing-workflow/leasing-step-kit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  TERMINATION_AGENT_DECISION,
  TERMINATION_AGENT_DECISION_LABEL,
  TERMINATION_STAGE,
  TERMINATION_TYPE,
  TENANT_SETTLEMENT_CONFIRMATION_LABEL,
  TERMINATION_STAGE_SHORT_LABEL,
  terminationStageOrderForCase,
} from '@/constants/end-leasing';
import { LEASING_ITEM_STATUS } from '@/lib/leasing/constants';
import { inspectionDetail } from '@/constants/routes';
import { fromLeasingWorkflow } from '@/lib/detail-navigation';
import { deriveStageStatus } from '@/lib/end-leasing/lifecycle';
import { useEndLeasingStore } from '@/lib/end-leasing/store';
import type { TerminationCaseDetail } from '@/lib/end-leasing/types';
import { terminationApi } from '@/lib/termination-case-api';
import { TerminationCompleteInspectionDialog } from '@/components/end-leasing/termination-complete-inspection-dialog';
import { TerminationKeyReturnDateDialog } from '@/components/end-leasing/termination-key-return-date-dialog';
import { TerminationVacateDateDialog } from '@/components/end-leasing/termination-vacate-date-dialog';
import type { MoveOutServicesChoice } from '@/lib/end-leasing/types';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

const DONE = LEASING_ITEM_STATUS.DONE;

const MOVE_OUT_SERVICES_LABEL: Record<MoveOutServicesChoice, string> = {
  pending: 'Pending',
  booked: 'Booked via CROSSUB',
  declined: 'Declined',
  own_arrangement: 'Tenant arranging own',
};

function vacateDateChangeReason(caseData: TerminationCaseDetail): string | null {
  const stored = caseData.vacatingPreparation?.vacateDateChangeReason?.trim();
  if (stored) return stored;

  const timelineHit = [...caseData.timeline]
    .reverse()
    .find((e) => /vacate date changed/i.test(e.label));
  if (!timelineHit) return null;

  const parts = timelineHit.label.split(' — ');
  return parts.length > 1 ? parts.slice(1).join(' — ').trim() : null;
}

function PhaseNotice({ caseData }: { caseData: TerminationCaseDetail }) {
  const notice = caseData.terminationNotice;
  const [loadingPdf, setLoadingPdf] = useState(false);

  const openPdf = async () => {
    setLoadingPdf(true);
    try {
      const blob = await terminationApi.downloadTerminationNotice(caseData.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      toast.error('Could not load notice PDF');
    } finally {
      setLoadingPdf(false);
    }
  };

  if (caseData.terminationType === TERMINATION_TYPE.TENANT_INITIATED) {
    return (
      <p className="text-muted-foreground text-xs">
        Tenant-initiated vacate — no statutory termination notice step.
      </p>
    );
  }

  return (
    <StepCard
      icon={FileText}
      title="Termination notice"
      status={deriveStageStatus(caseData, TERMINATION_STAGE.TERMINATION_NOTICE)}
      footer={
        notice?.emailSent ? (
          <Button size="sm" variant="outline" className="h-8 text-xs" disabled={loadingPdf} onClick={() => void openPdf()}>
            {loadingPdf ? 'Loading…' : 'View notice PDF'}
          </Button>
        ) : undefined
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <StepFact label="Ground" value={notice?.groundLabel ?? caseData.terminationReason ?? '—'} />
        <StepFact
          label="Notice sent"
          value={notice?.emailSent ? formatDateTime(notice.noticeEmailSentAt ?? caseData.createdAt) : 'Pending'}
        />
        <StepFact
          label="Tenant vacate date"
          value={notice?.tenantVacateDate ? formatDate(notice.tenantVacateDate) : 'Awaiting tenant'}
        />
      </div>
    </StepCard>
  );
}

function PhaseExitCleaning({ caseData }: { caseData: TerminationCaseDetail }) {
  const applyCase = useEndLeasingStore((s) => s.applyCase);
  const prep = caseData.vacatingPreparation ?? {
    exitCleaningConfirmed: false,
    moveOutServices: 'pending' as const,
  };
  const confirmed = prep.exitCleaningConfirmed;
  const [busy, setBusy] = useState(false);
  const [pendingChoice, setPendingChoice] = useState<MoveOutServicesChoice | null>(null);
  const services = pendingChoice ?? prep.moveOutServices;

  const saveServices = async (value: MoveOutServicesChoice) => {
    if (value === prep.moveOutServices) return;
    setPendingChoice(value);
    setBusy(true);
    try {
      const updated = await terminationApi.updateVacatingPreparation(caseData.id, {
        moveOutServices: value,
      });
      applyCase(updated);
      setPendingChoice(null);
      toast.success('Move-out services updated');
    } catch {
      setPendingChoice(null);
    } finally {
      setBusy(false);
    }
  };

  const confirmCleaning = async () => {
    setBusy(true);
    try {
      const updated = await terminationApi.updateVacatingPreparation(caseData.id, {
        exitCleaningConfirmed: true,
        moveOutServices: services === 'pending' ? 'own_arrangement' : services,
      });
      applyCase(updated);
      setPendingChoice(null);
      toast.success('Exit cleaning confirmed on behalf of tenant');
    } finally {
      setBusy(false);
    }
  };

  const exitCleaningStatus = confirmed
    ? DONE
    : services !== 'pending'
      ? LEASING_ITEM_STATUS.IN_PROGRESS
      : LEASING_ITEM_STATUS.NOT_STARTED;

  return (
    <StepCard
      icon={Sparkles}
      title="Exit cleaning"
      status={exitCleaningStatus}
      footer={
        !confirmed ? (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={busy}
            onClick={() => void confirmCleaning()}
          >
            Confirm on behalf of tenant
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-3">
        <div>
          <p className="text-muted-foreground text-[10px] uppercase tracking-wider">
            Move-out services
          </p>
          <select
            className="border-input bg-background mt-1 h-9 w-full rounded-md border px-2 text-xs"
            value={services}
            disabled={busy || confirmed}
            onChange={(e) => void saveServices(e.target.value as MoveOutServicesChoice)}
          >
            {(Object.keys(MOVE_OUT_SERVICES_LABEL) as MoveOutServicesChoice[]).map((key) => (
              <option key={key} value={key}>
                {MOVE_OUT_SERVICES_LABEL[key]}
              </option>
            ))}
          </select>
          <p className="text-muted-foreground mt-1 text-[11px]">
            Whether the tenant books end-of-lease cleaning through CROSSUB or arranges their own.
          </p>
        </div>
        <BoolStatus
          done={confirmed}
          doneLabel="Exit cleaning confirmed"
          pendingLabel="Awaiting exit cleaning confirmation"
        />
      </div>
    </StepCard>
  );
}

function PhaseVacatingPreparation({ caseData }: { caseData: TerminationCaseDetail }) {
  return (
    <div className="space-y-3">
      <PhaseKeyReturn caseData={caseData} />
      <PhaseExitCleaning caseData={caseData} />
    </div>
  );
}

function PhaseKeyReturn({ caseData }: { caseData: TerminationCaseDetail }) {
  const applyCase = useEndLeasingStore((s) => s.applyCase);
  const [vacateDialogOpen, setVacateDialogOpen] = useState(false);
  const [keyReturnDialogOpen, setKeyReturnDialogOpen] = useState(false);
  const expectedVacate =
    caseData.vacate.expectedVacateDate ?? caseData.vacateDate ?? '';
  const keyReturnDate =
    caseData.vacate.possessionRegainedDate ??
    caseData.vacate.actualVacateDate ??
    '';
  const keyReturnDateSet = Boolean(keyReturnDate);
  const vacateChangeReason = vacateDateChangeReason(caseData);

  return (
    <>
      <StepCard
        icon={KeyRound}
        title="Key return"
        status={deriveStageStatus(caseData, TERMINATION_STAGE.KEY_RETURN)}
        footer={
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              disabled={keyReturnDateSet}
              onClick={() => setKeyReturnDialogOpen(true)}
            >
              Set key return date
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => setVacateDialogOpen(true)}
            >
              Change vacate date
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <StepFact
            label="Expected vacate"
            value={expectedVacate ? formatDate(expectedVacate) : '—'}
          />
          <StepFact
            label="Key return date"
            value={keyReturnDate ? formatDate(keyReturnDate) : 'Not set'}
          />
          <BoolStatus
            done={caseData.vacate.keysReturned}
            doneLabel="Keys returned"
            pendingLabel="Awaiting key return"
          />
          {vacateChangeReason ? (
            <div className="col-span-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <p className="text-muted-foreground text-[10px] uppercase tracking-wider">
                Vacate date change reason
              </p>
              <p className="mt-1 text-[12.5px] leading-snug">{vacateChangeReason}</p>
              {caseData.vacateDateChangedAt ? (
                <p className="text-muted-foreground mt-1 text-[11px]">
                  Updated {formatDateTime(caseData.vacateDateChangedAt)}
                  {caseData.vacateDateChangedBy
                    ? ` · ${caseData.vacateDateChangedBy === 'tenant' ? 'Tenant' : 'Agent'}`
                    : ''}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </StepCard>

      <TerminationVacateDateDialog
        open={vacateDialogOpen}
        onOpenChange={setVacateDialogOpen}
        caseId={caseData.id}
        initialDate={expectedVacate.slice(0, 10)}
        onSaved={(updated) => {
          if (updated) applyCase(updated);
        }}
      />

      <TerminationKeyReturnDateDialog
        open={keyReturnDialogOpen}
        onOpenChange={setKeyReturnDialogOpen}
        caseId={caseData.id}
        initialDate={(keyReturnDate || expectedVacate).slice(0, 10)}
        keysReturned={caseData.vacate.keysReturned}
        onSaved={(updated) => {
          if (updated) applyCase(updated);
        }}
      />
    </>
  );
}

function PhaseOutgoingInspection({ caseData }: { caseData: TerminationCaseDetail }) {
  const router = useRouter();
  const applyCase = useEndLeasingStore((s) => s.applyCase);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [attendanceBusy, setAttendanceBusy] = useState(false);
  const inspection = caseData.inspection;
  const inspectionDone = inspection.status === DONE;
  const tenantAttendance = inspection.tenantAttendance ?? 'pending';

  const attendanceLabel =
    tenantAttendance === 'yes' ? 'Yes' : tenantAttendance === 'no' ? 'No' : 'Pending';

  const setAttendance = async (attendance: 'yes' | 'no') => {
    if (attendance === tenantAttendance) return;
    setAttendanceBusy(true);
    try {
      const updated = await terminationApi.setTenantOutgoingAttendance(caseData.id, attendance);
      applyCase(updated);
      toast.success(`Tenant attendance set to ${attendance === 'yes' ? 'Yes' : 'No'}`);
    } finally {
      setAttendanceBusy(false);
    }
  };

  return (
    <>
      <StepCard
        icon={ExternalLink}
        title="Outgoing inspection"
        status={deriveStageStatus(caseData, TERMINATION_STAGE.OUTGOING_INSPECTION)}
        footer={
          <div className="flex flex-wrap gap-2">
            {inspection.inspectionId ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs"
                onClick={() => {
                  if (!inspection.inspectionId) return;
                  router.push(
                    inspectionDetail(
                      inspection.inspectionId,
                      caseData.propertyId
                        ? fromLeasingWorkflow(caseData.propertyId)
                        : undefined,
                    ),
                  );
                }}
              >
                <ExternalLink className="size-3.5" />
                Open job case
              </Button>
            ) : null}
            {!inspectionDone ? (
              <Button
                size="sm"
                className="h-8 text-xs"
                onClick={() => setCompleteDialogOpen(true)}
              >
                Mark as done
              </Button>
            ) : null}
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <StepFact label="Inspector" value={inspection.inspectorName ?? 'Pending — task pool'} />
          <StepFact
            label="Scheduled"
            value={inspection.inspectionDate ? formatDateTime(inspection.inspectionDate) : 'Not scheduled'}
          />
          <StepFact label="Tenant attendance" value={attendanceLabel} />
          <StepFact label="Issues found" value={String(inspection.issuesFound)} />
          {!inspectionDone ? (
            <div className="col-span-2 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={tenantAttendance === 'yes' ? 'default' : 'outline'}
                className="h-8 text-xs"
                disabled={attendanceBusy}
                onClick={() => void setAttendance('yes')}
              >
                Tenant attending: Yes
              </Button>
              <Button
                type="button"
                size="sm"
                variant={tenantAttendance === 'no' ? 'default' : 'outline'}
                className="h-8 text-xs"
                disabled={attendanceBusy}
                onClick={() => void setAttendance('no')}
              >
                Tenant attending: No
              </Button>
            </div>
          ) : null}
          <BoolStatus
            done={inspectionDone}
            doneLabel="Inspection complete"
            pendingLabel="In progress"
          />
        </div>
      </StepCard>

      <TerminationCompleteInspectionDialog
        open={completeDialogOpen}
        onOpenChange={setCompleteDialogOpen}
        caseData={caseData}
        onCompleted={applyCase}
      />
    </>
  );
}

function PhaseMaintenance({ caseData }: { caseData: TerminationCaseDetail }) {
  const mg = caseData.makeGood;
  return (
    <StepCard icon={Wrench} title="Make good" status={deriveStageStatus(caseData, TERMINATION_STAGE.MAINTENANCE)}>
      <div className="grid grid-cols-2 gap-3">
        <StepFact label="Issues" value={String(mg.issueCount)} />
        <StepFact
          label="Est. deductions"
          value={mg.estimatedDeductions > 0 ? formatCurrency(mg.estimatedDeductions) : '—'}
        />
        <BoolStatus done={mg.qaComplete} doneLabel="Make-good complete" pendingLabel="CROSSUB processing" />
      </div>
    </StepCard>
  );
}

function PhaseBond({ caseData }: { caseData: TerminationCaseDetail }) {
  const agentApprove = useEndLeasingStore((s) => s.agentApprove);
  const agentReject = useEndLeasingStore((s) => s.agentReject);
  const setSettlementOpen = useEndLeasingStore((s) => s.setSettlementDialogOpen);
  const [rejectAmount, setRejectAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const canAgentAct =
    caseData.settlement.status === DONE &&
    caseData.agentApproval.decision === TERMINATION_AGENT_DECISION.PENDING;

  return (
    <div className="space-y-3">
      <StepCard icon={Receipt} title="Settlement" status={caseData.settlement.status}>
        <div className="grid grid-cols-2 gap-3">
          <StepFact label="Bond held" value={formatCurrency(caseData.settlement.bondHeld)} />
          <StepFact label="Deductions" value={formatCurrency(caseData.settlement.totalDeductions)} />
          <StepFact label="Refund" value={formatCurrency(caseData.settlement.refundAmount)} />
          <StepFact label="Debt" value={formatCurrency(caseData.settlement.debtAmount)} />
        </div>
        {caseData.settlement.deductions.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="mt-2 h-8 px-0 text-xs"
            onClick={() => setSettlementOpen(true)}
          >
            View deductions breakdown
          </Button>
        )}
      </StepCard>

      <StepCard icon={Landmark} title="Agent approval" status={caseData.agentApproval.status}>
        <StepFact
          label="Decision"
          value={TERMINATION_AGENT_DECISION_LABEL[caseData.agentApproval.decision]}
        />
        {canAgentAct && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              className="h-8 text-xs"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await agentApprove(caseData.id);
                  toast.success('Settlement approved');
                } finally {
                  setBusy(false);
                }
              }}
            >
              Approve settlement
            </Button>
            <div className="flex min-w-[200px] flex-1 gap-2">
              <Input
                type="number"
                className="h-8 text-xs"
                placeholder="Proposed deductions"
                value={rejectAmount}
                onChange={(e) => setRejectAmount(e.target.value)}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 shrink-0 text-xs"
                disabled={busy || !rejectAmount}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await agentReject(caseData.id, Number(rejectAmount));
                    toast.success('Adjustment submitted');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Propose adjustment
              </Button>
            </div>
          </div>
        )}
      </StepCard>

      <StepCard icon={ClipboardCheck} title="Tenant confirmation" status={deriveStageStatus(caseData, TERMINATION_STAGE.BOND)}>
        <StepFact
          label="Status"
          value={TENANT_SETTLEMENT_CONFIRMATION_LABEL[caseData.tenantConfirmation.status]}
        />
        {caseData.tenantConfirmation.dueAt && (
          <StepFact label="Due" value={formatDateTime(caseData.tenantConfirmation.dueAt)} className="mt-2" />
        )}
      </StepCard>

      <StepCard icon={Landmark} title="Bond refund" status={caseData.bond.status}>
        <StepFact label="Refund amount" value={formatCurrency(caseData.bond.refundAmount)} />
        <ul className="mt-3 space-y-1.5">
          {caseData.bond.readiness.map((item) => (
            <li key={item.label} className="text-muted-foreground flex items-center gap-2 text-xs">
              <span className={item.done ? 'text-emerald-600' : 'text-muted-foreground'}>
                {item.done ? '✓' : '○'}
              </span>
              {item.label}
            </li>
          ))}
        </ul>
      </StepCard>
    </div>
  );
}

export function TerminationPhasePanel({
  caseData,
  stage,
}: {
  caseData: TerminationCaseDetail;
  stage: (typeof TERMINATION_STAGE)[keyof typeof TERMINATION_STAGE];
}) {
  switch (stage) {
    case TERMINATION_STAGE.TERMINATION_NOTICE:
      return <PhaseNotice caseData={caseData} />;
    case TERMINATION_STAGE.KEY_RETURN:
      return <PhaseVacatingPreparation caseData={caseData} />;
    case TERMINATION_STAGE.OUTGOING_INSPECTION:
      return <PhaseOutgoingInspection caseData={caseData} />;
    case TERMINATION_STAGE.MAINTENANCE:
      return <PhaseMaintenance caseData={caseData} />;
    case TERMINATION_STAGE.BOND:
      return <PhaseBond caseData={caseData} />;
    default:
      return null;
  }
}

export function TerminationPhaseTabs({
  caseData,
  activeStage,
  onStageChange,
}: {
  caseData: TerminationCaseDetail;
  activeStage: (typeof TERMINATION_STAGE)[keyof typeof TERMINATION_STAGE];
  onStageChange: (stage: (typeof TERMINATION_STAGE)[keyof typeof TERMINATION_STAGE]) => void;
}) {
  const stages = terminationStageOrderForCase(caseData.terminationType);

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {stages.map((stage) => {
        const status = deriveStageStatus(caseData, stage);
        const active = stage === activeStage;
        return (
          <button
            key={stage}
            type="button"
            onClick={() => onStageChange(stage)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium ${
              active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card'
            }`}
          >
            {TERMINATION_STAGE_SHORT_LABEL[stage]}
            {status === DONE ? ' ✓' : ''}
          </button>
        );
      })}
    </div>
  );
}
