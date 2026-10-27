'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, Archive, Loader2, Trash2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ARCHIVE_TENANCY_COPY,
  RESTORE_TENANCY_COPY,
  TENANCY_SECTION_COPY,
  WITHDRAW_INCOMING_COPY,
} from '@/constants/property-tenancies';
import { archivePropertyTenancy, restorePropertyTenancy } from '@/lib/crossub-api/agent-client';
import {
  removeManualTenancy,
  withdrawIncomingTenancy,
  type PropertyTenancyOverview,
} from '@/lib/crossub-api/agent-tenancy-client';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import {
  removableManualLeaseIds,
  type PropertyTenancyGroup,
} from '@/utils/property-tenancy-groups';
import { openTerminationCaseForArchive } from '@/utils/property-tenancy-rows';

/** The tenancy actions that ask before they act: archive, restore, archive incoming, remove. */

const withName = (template: string, name: string) => template.replace('{name}', name);

function useAction(run: () => Promise<void>, done: string, failed: string, onDone: () => void) {
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await run();
      toast.success(done);
      onDone();
    } catch (err) {
      toast.error(apiErrorMessage(err, failed));
    } finally {
      setBusy(false);
    }
  };
  return { busy, submit };
}

function ConfirmShell({
  open,
  onOpenChange,
  title,
  description,
  busy,
  confirmLabel,
  confirmIcon: Icon,
  confirmDisabled,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  busy: boolean;
  confirmLabel: string;
  confirmIcon: typeof Archive;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  children?: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => (busy ? undefined : onOpenChange(next))}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children ? <div className="space-y-4 text-sm">{children}</div> : null}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            {TENANCY_SECTION_COPY.CANCEL}
          </Button>
          <Button type="button" className="gap-1.5" disabled={busy || confirmDisabled} onClick={onConfirm}>
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Icon className="size-3.5" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulletList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div>
      <p className="text-foreground font-medium">{title}</p>
      <ul className="text-muted-foreground mt-1 space-y-0.5 text-xs">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}

export function ArchiveTenancyDialog({
  open,
  onOpenChange,
  record,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: PropertyTenancyOverview;
  onDone: () => void;
}) {
  const openCase = openTerminationCaseForArchive(record);
  const tenantName = record.tenant?.name?.trim();
  const hasIncoming = (record.currentTenancy?.incomingTenancyIds.length ?? 0) > 0;
  const { busy, submit } = useAction(
    async () => {
      await archivePropertyTenancy(record.propertyId);
    },
    ARCHIVE_TENANCY_COPY.DONE,
    ARCHIVE_TENANCY_COPY.FAILED,
    () => {
      onOpenChange(false);
      onDone();
    },
  );
  return (
    <ConfirmShell
      open={open}
      onOpenChange={onOpenChange}
      title={TENANCY_SECTION_COPY.ARCHIVE_TENANCY}
      description={
        tenantName
          ? withName(ARCHIVE_TENANCY_COPY.DESCRIPTION_NAMED, tenantName)
          : ARCHIVE_TENANCY_COPY.DESCRIPTION
      }
      busy={busy}
      confirmLabel={TENANCY_SECTION_COPY.ARCHIVE_TENANCY}
      confirmIcon={Archive}
      onConfirm={() => void submit()}
    >
      {openCase ? (
        <div className="flex gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="min-w-0">
            <p className="font-medium text-amber-900 dark:text-amber-100">
              {ARCHIVE_TENANCY_COPY.OPEN_CASE_TITLE} {openCase.title}
            </p>
            <p className="mt-0.5 text-xs text-amber-900/80 dark:text-amber-100/80">
              {ARCHIVE_TENANCY_COPY.OPEN_CASE_BODY}
            </p>
          </div>
        </div>
      ) : null}
      <div>
        <p className="text-foreground font-medium">{ARCHIVE_TENANCY_COPY.KEPT_TITLE}</p>
        <p className="text-muted-foreground mt-1 text-xs">{ARCHIVE_TENANCY_COPY.KEPT_BODY}</p>
      </div>
      <BulletList title={ARCHIVE_TENANCY_COPY.CLEARED_TITLE} items={ARCHIVE_TENANCY_COPY.CLEARED} />
      {hasIncoming ? (
        <p className="text-muted-foreground text-xs">{ARCHIVE_TENANCY_COPY.INCOMING_NOTE}</p>
      ) : null}
    </ConfirmShell>
  );
}

export function RestoreTenancyDialog({
  open,
  onOpenChange,
  propertyId,
  tenantName,
  archivedAt,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  tenantName?: string;
  archivedAt?: string;
  onDone: () => void;
}) {
  const { busy, submit } = useAction(
    async () => {
      if (!archivedAt) throw new Error(RESTORE_TENANCY_COPY.FAILED);
      await restorePropertyTenancy(propertyId, archivedAt);
    },
    RESTORE_TENANCY_COPY.DONE,
    RESTORE_TENANCY_COPY.FAILED,
    () => {
      onOpenChange(false);
      onDone();
    },
  );
  return (
    <ConfirmShell
      open={open}
      onOpenChange={onOpenChange}
      title={TENANCY_SECTION_COPY.RESTORE}
      description={
        tenantName
          ? withName(RESTORE_TENANCY_COPY.DESCRIPTION_NAMED, tenantName)
          : RESTORE_TENANCY_COPY.DESCRIPTION
      }
      busy={busy}
      confirmLabel={TENANCY_SECTION_COPY.RESTORE}
      confirmIcon={Undo2}
      confirmDisabled={!archivedAt}
      onConfirm={() => void submit()}
    >
      <BulletList title={RESTORE_TENANCY_COPY.RESTORED_TITLE} items={RESTORE_TENANCY_COPY.RESTORED} />
      <div>
        <p className="text-foreground font-medium">{RESTORE_TENANCY_COPY.NOT_RESTORED_TITLE}</p>
        <p className="text-muted-foreground mt-1 text-xs">{RESTORE_TENANCY_COPY.NOT_RESTORED_BODY}</p>
      </div>
    </ConfirmShell>
  );
}

export function WithdrawIncomingTenancyDialog({
  open,
  onOpenChange,
  propertyId,
  group,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  group: PropertyTenancyGroup | null;
  onDone: () => void;
}) {
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (open) setReason('');
  }, [open]);
  const trimmed = reason.trim();
  const cycleId = group?.leasingCaseId;
  const names = (group?.members ?? []).map((m) => m.name).filter(Boolean);
  const { busy, submit } = useAction(
    async () => {
      if (!cycleId || !trimmed) throw new Error(WITHDRAW_INCOMING_COPY.FAILED);
      await withdrawIncomingTenancy(propertyId, cycleId, trimmed);
    },
    WITHDRAW_INCOMING_COPY.DONE,
    WITHDRAW_INCOMING_COPY.FAILED,
    () => {
      onOpenChange(false);
      onDone();
    },
  );
  return (
    <ConfirmShell
      open={open}
      onOpenChange={onOpenChange}
      title={WITHDRAW_INCOMING_COPY.TITLE}
      description={WITHDRAW_INCOMING_COPY.DESCRIPTION}
      busy={busy}
      confirmLabel={WITHDRAW_INCOMING_COPY.CONFIRM}
      confirmIcon={Archive}
      confirmDisabled={!cycleId || !trimmed}
      onConfirm={() => void submit()}
    >
      {names.length > 0 ? (
        <div>
          <p className="text-foreground font-medium">{WITHDRAW_INCOMING_COPY.MEMBERS_HEADING}</p>
          <p className="text-muted-foreground mt-1 text-xs">{names.join(', ')}</p>
        </div>
      ) : null}
      <BulletList
        title={WITHDRAW_INCOMING_COPY.WHAT_HAPPENS_HEADING}
        items={WITHDRAW_INCOMING_COPY.WHAT_HAPPENS}
      />
      <div className="space-y-1.5">
        <Label htmlFor="withdraw-incoming-reason">{WITHDRAW_INCOMING_COPY.REASON_LABEL}</Label>
        <Textarea
          id="withdraw-incoming-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={WITHDRAW_INCOMING_COPY.REASON_PLACEHOLDER}
          rows={3}
        />
      </div>
    </ConfirmShell>
  );
}

export function RemoveTenancyDialog({
  open,
  onOpenChange,
  propertyId,
  group,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  group: PropertyTenancyGroup | null;
  onDone: () => void;
}) {
  const agreementIds = group ? removableManualLeaseIds(group) : [];
  const { busy, submit } = useAction(
    async () => {
      if (agreementIds.length === 0) throw new Error(TENANCY_SECTION_COPY.REMOVE_FAILED);
      await removeManualTenancy(propertyId, agreementIds);
    },
    TENANCY_SECTION_COPY.REMOVED,
    TENANCY_SECTION_COPY.REMOVE_FAILED,
    () => {
      onOpenChange(false);
      onDone();
    },
  );
  return (
    <ConfirmShell
      open={open}
      onOpenChange={onOpenChange}
      title={TENANCY_SECTION_COPY.REMOVE_TENANCY_TITLE}
      description={TENANCY_SECTION_COPY.REMOVE_TENANCY_BODY}
      busy={busy}
      confirmLabel={TENANCY_SECTION_COPY.REMOVE_TENANCY}
      confirmIcon={Trash2}
      confirmDisabled={agreementIds.length === 0}
      onConfirm={() => void submit()}
    />
  );
}
