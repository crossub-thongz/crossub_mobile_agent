'use client';

import { useEffect, useState } from 'react';
import { ArrowLeftRight, Building2, Shield, User } from 'lucide-react';
import { toast } from 'sonner';

import { MaintenanceResponsibilityLandlordPanel } from '@/components/maintenance/maintenance-responsibility-landlord-panel';
import {
  MaintenanceContractorRfqEmailEditor,
  type ContractorRfqEmailDraft,
} from '@/components/maintenance/maintenance-contractor-rfq-email-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { confirmMaintenanceResponsibility } from '@/lib/maintenance/maintenance-case-ops';
import { canChangeMaintenanceResponsibility } from '@/lib/maintenance/can-change-responsibility';
import { resolveMaintenanceResponsibility } from '@/lib/maintenance/infer-responsibility';
import type { MaintenanceWorkflowContext } from '@/lib/maintenance/agent-workflow-model';
import {
  fetchMaintenanceContractorSuggestions,
  type MaintenanceContractorSuggestion,
  type MaintenanceWorkflowResponsibility,
} from '@/lib/crossub-api/maintenance-client';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { cn } from '@/lib/utils';

const RESPONSIBILITY_OPTIONS: {
  value: MaintenanceWorkflowResponsibility;
  label: string;
  icon: typeof User;
}[] = [
  { value: 'tenant', label: 'Tenant', icon: User },
  { value: 'landlord', label: 'Landlord', icon: Building2 },
  { value: 'strata', label: 'Strata', icon: Shield },
];

function parseCcEmails(value: string): string[] {
  return value
    .split(/[,;\n]/g)
    .map((part) => part.trim())
    .filter((part) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(part));
}

/**
 * Change who owns the repair after review has already been confirmed.
 * Sits in the step header: the case stays read-only for everything else,
 * but this control stays available until a visit is booked.
 */
export function MaintenanceChangeResponsibility({
  ctx,
  agencyId,
  apiConnected,
  onCaseUpdated,
  className,
}: {
  ctx: MaintenanceWorkflowContext;
  agencyId?: string;
  apiConnected?: boolean;
  onCaseUpdated?: () => Promise<void>;
  className?: string;
}) {
  const current = resolveMaintenanceResponsibility(ctx);
  const allowed = canChangeMaintenanceResponsibility(ctx.workspaceCase);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<MaintenanceWorkflowResponsibility | null>(current ?? null);
  const [contractorIds, setContractorIds] = useState<string[]>([]);
  const [rfqEmail, setRfqEmail] = useState<ContractorRfqEmailDraft | null>(null);
  const [suggestions, setSuggestions] = useState<MaintenanceContractorSuggestion[]>([]);
  const [ccInput, setCcInput] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOpen(false);
    setPending(current ?? null);
    setContractorIds([]);
    setRfqEmail(null);
    setCcInput('');
  }, [ctx.item.id, current]);

  useEffect(() => {
    if (!open || !apiConnected) return;
    void fetchMaintenanceContractorSuggestions(ctx.item.id)
      .then(setSuggestions)
      .catch(() => setSuggestions([]));
  }, [open, apiConnected, ctx.item.id]);

  if (!allowed) return null;

  const isLandlord = pending === 'landlord';
  const showCc = pending === 'tenant' || pending === 'strata';
  const previewContractorName =
    contractorIds.length > 0
      ? suggestions.find((row) => row.id === contractorIds[0])?.name
      : undefined;
  const confirmDisabled =
    !pending ||
    busy ||
    pending === current ||
    (isLandlord &&
      (contractorIds.length === 0 || !rfqEmail?.subject?.trim() || !rfqEmail?.bodyText?.trim()));

  const save = async () => {
    if (!pending || pending === current) return;
    if (!apiConnected) {
      toast.error('Connect to the API to change responsibility.');
      return;
    }
    if (isLandlord && contractorIds.length === 0) {
      toast.error('Select at least one tradesman for landlord responsibility.');
      return;
    }
    setBusy(true);
    try {
      await confirmMaintenanceResponsibility(ctx.item.id, pending, {
        preferredContractorIds: isLandlord ? contractorIds : undefined,
        ccEmails: showCc ? parseCcEmails(ccInput) : undefined,
        currentStatus: ctx.workspaceCase.status,
        rfqMessage:
          isLandlord && rfqEmail
            ? { subject: rfqEmail.subject.trim(), bodyText: rfqEmail.bodyText.trim() }
            : undefined,
        previewContractorName,
      });
      toast.success(`Responsibility changed to ${pending}`);
      setOpen(false);
      await onCaseUpdated?.();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not change responsibility'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn('min-w-0 flex-1', className)}>
      {open ? (
        <div className="bg-background space-y-3 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold">Who owns this repair</p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {RESPONSIBILITY_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                disabled={busy}
                onClick={() => {
                  setPending(value);
                  setRfqEmail(null);
                  if (value !== 'landlord') setContractorIds([]);
                }}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg border py-2 text-xs font-medium capitalize',
                  pending === value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-secondary',
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
          {isLandlord ? (
            <>
              <MaintenanceResponsibilityLandlordPanel
                requestId={ctx.item.id}
                agencyId={agencyId}
                issueType={ctx.workspaceCase.issueType}
                apiConnected={Boolean(apiConnected)}
                selectedContractorIds={contractorIds}
                onChangeSelectedContractorIds={setContractorIds}
                disabled={busy}
              />
              {contractorIds.length > 0 ? (
                <MaintenanceContractorRfqEmailEditor
                  requestId={ctx.item.id}
                  previewContractorName={previewContractorName}
                  value={rfqEmail}
                  onChange={setRfqEmail}
                  disabled={busy}
                />
              ) : null}
            </>
          ) : null}
          {showCc ? (
            <Input
              value={ccInput}
              onChange={(e) => setCcInput(e.target.value)}
              placeholder="Cc emails, separated by commas"
              className="h-8 text-xs"
              disabled={busy}
            />
          ) : null}
          <p className="text-muted-foreground text-[11px]">
            This updates who is responsible for the repair. It cannot be changed once a visit is
            booked.
          </p>
          <Button type="button" size="sm" className="w-full" disabled={confirmDisabled} onClick={() => void save()}>
            Save responsibility
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setPending(current ?? null);
            setOpen(true);
          }}
          className="bg-background/80 hover:bg-background flex w-full items-center justify-between gap-3 rounded-lg border border-dashed px-3 py-2 text-left"
        >
          <span className="min-w-0">
            <span className="text-muted-foreground block text-[10px] font-semibold uppercase tracking-wide">
              Responsibility
            </span>
            <span className="text-sm font-semibold capitalize">{current ?? 'Not set'}</span>
          </span>
          <span className="text-primary inline-flex shrink-0 items-center gap-1 text-xs font-semibold">
            <ArrowLeftRight className="size-3.5" />
            {current ? 'Change responsibility' : 'Assign responsibility'}
          </span>
        </button>
      )}
    </div>
  );
}
