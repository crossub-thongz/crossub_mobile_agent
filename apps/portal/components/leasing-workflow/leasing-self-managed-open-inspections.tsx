'use client';

import { useState } from 'react';
import { CalendarClock, Download, FileText, Play, Plus, QrCode, Square, X } from 'lucide-react';
import { toast } from 'sonner';

import { StatusBadge } from '@/components/agent/status-badge';
import { OpenInspectionApplicantLinksPanel } from '@/components/open-inspection/open-inspection-applicant-links-panel';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  LETTING_OPEN_CANCEL_REASON_MAX,
  LETTING_OPEN_NOTES_MAX,
  LETTING_OPEN_STATUS_BADGE,
  LETTING_OPEN_STATUS_LABEL,
  SELF_MANAGED_OPEN_COPY as COPY,
} from '@/constants/self-managed-open-inspections';
import { useAgencyTeamMembers } from '@/hooks/use-agency-team-members';
import { useLettingOpenInspections } from '@/hooks/use-letting-open-inspections';
import {
  addLettingOpenInspection,
  cancelLettingOpenInspection,
  closeLettingOpenInspection,
  downloadLettingOpenInspectionReport,
  generateLettingOpenInspectionReport,
  startLettingOpenInspection,
  type LettingOpenInspection,
  type LettingOpenInspections,
} from '@/lib/crossub-api/agent-letting-open-client';
import { fetchLeasingCycleView, invalidateLeasingCycleView } from '@/lib/leasing/fetch-leasing-cycle';
import { LEASING_UI } from '@/lib/leasing/constants';
import { formatInspectionTimeRange } from '@/lib/leasing/open-inspection-display';
import {
  buildAddLettingOpenInput,
  canGenerateLettingOpenReport,
  canStartLettingOpen,
  defaultLettingOpenWindow,
  isLettingOpenCancelled,
  isLettingOpenLive,
  lettingOpenHasReport,
  lettingOpenReportFilename,
  reportableLettingOpens,
  splitLettingOpens,
  type LettingOpenForm,
} from '@/lib/leasing/self-managed-opens';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';
import { cn, formatDate } from '@/lib/utils';
import { agencyTeamMemberLabel } from '@/utils/leasing-relet-decision';
import { saveBlobAs } from '@/utils/save-blob';

const SELECT_CLASS =
  'border-input bg-background h-9 w-full rounded-md border px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50';

type OpenAction = 'start' | 'finish' | 'report' | 'download';

/** Re-read the letting after an open changes, so the step rail follows the opens. */
function useRefreshLetting(propertyId: string, cycleId: string) {
  const applyCycleView = useLeasingWorkflowStore((s) => s.applyCycleView);
  return async () => {
    invalidateLeasingCycleView(cycleId);
    try {
      applyCycleView(propertyId, await fetchLeasingCycleView(cycleId));
    } catch {
      /* live sync will catch up */
    }
  };
}

/** Per-open actions shared by the Scheduling and Report steps. */
function useOpenActions(
  propertyId: string,
  cycleId: string,
  onList: (list: LettingOpenInspections) => void,
) {
  const [busy, setBusy] = useState<string | null>(null);
  const refreshLetting = useRefreshLetting(propertyId, cycleId);

  const run = async (
    open: LettingOpenInspection,
    action: OpenAction,
    success: string | null,
    write: () => Promise<LettingOpenInspections | void>,
  ) => {
    setBusy(`${open.viewingSessionId}:${action}`);
    try {
      const list = await write();
      if (list) {
        onList(list);
        await refreshLetting();
      }
      if (success) toast.success(success);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  return {
    isBusy: (open: LettingOpenInspection, action: OpenAction) =>
      busy === `${open.viewingSessionId}:${action}`,
    anyBusy: busy !== null,
    start: (open: LettingOpenInspection) =>
      run(open, 'start', COPY.started, () =>
        startLettingOpenInspection(propertyId, cycleId, open.viewingSessionId),
      ),
    finish: (open: LettingOpenInspection) =>
      run(open, 'finish', COPY.finished, () =>
        closeLettingOpenInspection(propertyId, cycleId, open.viewingSessionId),
      ),
    generateReport: (open: LettingOpenInspection) =>
      run(open, 'report', COPY.generated, () =>
        generateLettingOpenInspectionReport(propertyId, cycleId, open.viewingSessionId),
      ),
    downloadReport: (open: LettingOpenInspection) =>
      run(open, 'download', null, async () => {
        const blob = await downloadLettingOpenInspectionReport(propertyId, cycleId, open.viewingSessionId);
        saveBlobAs(blob, lettingOpenReportFilename(open));
      }),
    refreshLetting,
  };
}

type OpenActions = ReturnType<typeof useOpenActions>;

function OpenReportButtons({ open, actions }: { open: LettingOpenInspection; actions: OpenActions }) {
  if (lettingOpenHasReport(open)) {
    return (
      <Button
        size="sm"
        variant="outline"
        className={cn('h-8 gap-1.5 text-xs', LEASING_UI.btnSecondary)}
        disabled={actions.anyBusy}
        onClick={() => void actions.downloadReport(open)}
      >
        <Download className="size-3.5" />
        {actions.isBusy(open, 'download') ? COPY.downloading : COPY.downloadReport}
      </Button>
    );
  }
  if (!canGenerateLettingOpenReport(open)) return null;
  return (
    <Button
      size="sm"
      variant="outline"
      className={cn('h-8 gap-1.5 text-xs', LEASING_UI.btnSecondary)}
      disabled={actions.anyBusy}
      onClick={() => void actions.generateReport(open)}
    >
      <FileText className="size-3.5" />
      {actions.isBusy(open, 'report') ? COPY.generating : COPY.generateReport}
    </Button>
  );
}

function OpenSummary({ open }: { open: LettingOpenInspection }) {
  return (
    <div className="min-w-0 flex-1 space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold">
          {formatInspectionTimeRange(open.startTime, open.endTime ?? undefined)}
        </p>
        <StatusBadge
          label={LETTING_OPEN_STATUS_LABEL[open.status]}
          variant={LETTING_OPEN_STATUS_BADGE[open.status]}
        />
        {open.current && !isLettingOpenCancelled(open) ? (
          <StatusBadge label={COPY.current} variant="approval" />
        ) : null}
      </div>
      {open.hostName ? (
        <p className="text-muted-foreground text-xs">{COPY.runBy(open.hostName)}</p>
      ) : null}
      <p className="text-muted-foreground text-xs">
        {COPY.counts(open.attendeeCount, open.checkedInCount, open.applicationCount)}
      </p>
      {open.notes ? (
        <p className="text-muted-foreground whitespace-pre-wrap text-xs leading-relaxed">{open.notes}</p>
      ) : null}
      {open.reportGeneratedAt ? (
        <p className="text-muted-foreground text-xs">
          {COPY.reportGeneratedAt(formatDate(open.reportGeneratedAt))}
        </p>
      ) : null}
    </div>
  );
}

function OpenCard({
  open,
  propertyId,
  apiConnected,
  actions,
  onCancel,
}: {
  open: LettingOpenInspection;
  propertyId: string;
  apiConnected: boolean;
  actions: OpenActions;
  onCancel: (open: LettingOpenInspection) => void;
}) {
  const [showLinks, setShowLinks] = useState(false);
  const live = isLettingOpenLive(open);
  const cancelled = isLettingOpenCancelled(open);

  return (
    <div className={cn('space-y-3 rounded-xl border bg-card p-4', cancelled && 'opacity-60')}>
      <div className="flex items-start gap-3">
        <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
          <CalendarClock className="size-4" />
        </span>
        <OpenSummary open={open} />
      </div>
      {cancelled ? null : (
        <div className="flex flex-wrap items-center gap-2">
          {canStartLettingOpen(open) ? (
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs"
              disabled={actions.anyBusy}
              onClick={() => void actions.start(open)}
            >
              <Play className="size-3.5" />
              {COPY.startOpen}
            </Button>
          ) : null}
          {live ? (
            <Button
              size="sm"
              variant="outline"
              className={cn('h-8 gap-1.5 text-xs', LEASING_UI.btnSecondary)}
              disabled={actions.anyBusy}
              onClick={() => void actions.finish(open)}
            >
              <Square className="size-3.5" />
              {COPY.finishOpen}
            </Button>
          ) : null}
          <OpenReportButtons open={open} actions={actions} />
          <Button
            size="sm"
            variant="outline"
            className={cn('h-8 gap-1.5 text-xs', LEASING_UI.btnSecondary)}
            onClick={() => setShowLinks((v) => !v)}
          >
            <QrCode className="size-3.5" />
            {showLinks ? COPY.hideLinks : COPY.links}
          </Button>
          {live ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive"
              disabled={actions.anyBusy}
              onClick={() => onCancel(open)}
            >
              <X className="size-3.5" />
              {COPY.cancelOpen}
            </Button>
          ) : null}
        </div>
      )}
      {showLinks && !cancelled ? (
        <OpenInspectionApplicantLinksPanel
          propertyId={propertyId}
          viewingSessionId={open.viewingSessionId}
          apiConnected={apiConnected}
        />
      ) : null}
    </div>
  );
}

function HostSelect({
  agencyId,
  value,
  onChange,
  disabled,
}: {
  agencyId: string | null | undefined;
  value: string;
  onChange: (userId: string) => void;
  disabled: boolean;
}) {
  const { members, loading } = useAgencyTeamMembers(agencyId, true);
  return (
    <select
      id="letting-open-host"
      className={SELECT_CLASS}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || loading}
    >
      <option value="">{COPY.hostDefault}</option>
      {members.map((member) => (
        <option key={member.userId} value={member.userId}>
          {agencyTeamMemberLabel(member)}
        </option>
      ))}
    </select>
  );
}

/**
 * Self-Manage Scheduling step: every open on the letting, each with its own status, actions,
 * applicant links and report, and "Add open inspection" until the property is leased.
 */
export function LeasingSelfManagedOpenInspections({
  detail,
  cycleId,
  addDisabledReason,
}: {
  detail: LeasingPropertyDetail;
  cycleId: string;
  /** Set while the letting cannot take an open yet (awaiting the re-let decision). */
  addDisabledReason?: string;
}) {
  const { apiConnected, properties } = useAgentData();
  const { data, error, setData } = useLettingOpenInspections(detail.propertyId, cycleId, apiConnected);
  const actions = useOpenActions(detail.propertyId, cycleId, setData);
  const agencyId =
    detail.agencyId ?? properties.find((row) => row.id === detail.propertyId)?.agencyId ?? null;

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<LettingOpenForm>({ startLocal: '', endLocal: '', notes: '', hostUserId: '' });
  const [saving, setSaving] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<LettingOpenInspection | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);

  const { kept, cancelled } = splitLettingOpens(data?.opens ?? []);
  const blockedReason = addDisabledReason ?? data?.addBlockedReason ?? null;

  const openAddDialog = () => {
    const slot = defaultLettingOpenWindow(data?.opens ?? []);
    setForm({ startLocal: slot.start, endLocal: slot.end, notes: '', hostUserId: '' });
    setAddOpen(true);
  };

  const saveOpen = async () => {
    let body;
    try {
      body = buildAddLettingOpenInput(form);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      return;
    }
    setSaving(true);
    try {
      setData(await addLettingOpenInspection(detail.propertyId, cycleId, body));
      await actions.refreshLetting();
      toast.success(COPY.added);
      setAddOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const reason = cancelReason.trim();
      setData(
        await cancelLettingOpenInspection(detail.propertyId, cycleId, cancelTarget.viewingSessionId, {
          ...(reason ? { reason } : {}),
        }),
      );
      await actions.refreshLetting();
      toast.success(COPY.cancelled);
      setCancelTarget(null);
      setCancelReason('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-semibold">{COPY.listTitle}</p>
          <p className="text-muted-foreground max-w-xl text-xs leading-relaxed">{COPY.listHint}</p>
        </div>
        <Button
          type="button"
          size="sm"
          className="h-9 gap-1.5"
          disabled={!apiConnected || Boolean(blockedReason) || !data}
          title={blockedReason ?? undefined}
          onClick={openAddDialog}
        >
          <Plus className="size-4" />
          {COPY.add}
        </Button>
      </div>
      {blockedReason ? (
        <p className={cn('rounded-lg border px-3 py-2 text-xs', LEASING_UI.callout)}>{blockedReason}</p>
      ) : null}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}

      {data && kept.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-8 text-center">
          <p className="text-muted-foreground mx-auto max-w-sm text-xs">{COPY.empty}</p>
        </div>
      ) : null}

      {kept.map((open) => (
        <OpenCard
          key={open.viewingSessionId}
          open={open}
          propertyId={detail.propertyId}
          apiConnected={apiConnected}
          actions={actions}
          onCancel={setCancelTarget}
        />
      ))}

      {cancelled.length > 0 ? (
        <div className="space-y-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => setShowCancelled((v) => !v)}
          >
            {showCancelled ? COPY.hideCancelled : COPY.showCancelled(cancelled.length)}
          </Button>
          {showCancelled
            ? cancelled.map((open) => (
                <OpenCard
                  key={open.viewingSessionId}
                  open={open}
                  propertyId={detail.propertyId}
                  apiConnected={apiConnected}
                  actions={actions}
                  onCancel={setCancelTarget}
                />
              ))
            : null}
        </div>
      ) : null}

      <Dialog open={addOpen} onOpenChange={(next) => (saving ? undefined : setAddOpen(next))}>
        <DialogContent elevated>
          <DialogHeader>
            <DialogTitle>{COPY.addTitle}</DialogTitle>
            <DialogDescription>{COPY.addDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="letting-open-start" className="text-xs">
                  {COPY.start}
                </Label>
                <Input
                  id="letting-open-start"
                  type="datetime-local"
                  value={form.startLocal}
                  disabled={saving}
                  onChange={(e) => setForm((f) => ({ ...f, startLocal: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="letting-open-end" className="text-xs">
                  {COPY.end}
                </Label>
                <Input
                  id="letting-open-end"
                  type="datetime-local"
                  value={form.endLocal}
                  disabled={saving}
                  onChange={(e) => setForm((f) => ({ ...f, endLocal: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="letting-open-host" className="text-xs">
                {COPY.host}
              </Label>
              <HostSelect
                agencyId={agencyId}
                value={form.hostUserId}
                disabled={saving}
                onChange={(hostUserId) => setForm((f) => ({ ...f, hostUserId }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="letting-open-notes" className="text-xs">
                {COPY.notes}
              </Label>
              <Textarea
                id="letting-open-notes"
                inputKind="internal_note"
                rows={3}
                maxLength={LETTING_OPEN_NOTES_MAX}
                placeholder={COPY.notesPlaceholder}
                value={form.notes}
                disabled={saving}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => setAddOpen(false)}>
              {COPY.dismiss}
            </Button>
            <Button type="button" disabled={saving} onClick={() => void saveOpen()}>
              {saving ? COPY.saving : COPY.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={cancelTarget !== null}
        onOpenChange={(next) => {
          if (next || cancelling) return;
          setCancelTarget(null);
          setCancelReason('');
        }}
      >
        <DialogContent elevated>
          <DialogHeader>
            <DialogTitle>{COPY.cancelTitle}</DialogTitle>
            <DialogDescription>
              {cancelTarget
                ? `${formatInspectionTimeRange(cancelTarget.startTime, cancelTarget.endTime ?? undefined)}. `
                : null}
              {COPY.cancelDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="letting-open-cancel-reason">{COPY.cancelReason}</Label>
            <Textarea
              id="letting-open-cancel-reason"
              inputKind="internal_note"
              rows={3}
              maxLength={LETTING_OPEN_CANCEL_REASON_MAX}
              value={cancelReason}
              disabled={cancelling}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={cancelling}
              onClick={() => {
                setCancelTarget(null);
                setCancelReason('');
              }}
            >
              {COPY.cancelKeep}
            </Button>
            <Button type="button" variant="destructive" disabled={cancelling} onClick={() => void confirmCancel()}>
              {COPY.cancelConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Self-Manage Report step: one report per open that has been held. */
export function LeasingSelfManagedOpenReports({
  detail,
  cycleId,
}: {
  detail: LeasingPropertyDetail;
  cycleId: string;
}) {
  const { apiConnected } = useAgentData();
  const { data, error, setData } = useLettingOpenInspections(detail.propertyId, cycleId, apiConnected);
  const actions = useOpenActions(detail.propertyId, cycleId, setData);
  const held = reportableLettingOpens(data?.opens ?? []);

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="space-y-0.5">
        <p className="text-sm font-semibold">{COPY.reportsTitle}</p>
        <p className="text-muted-foreground text-xs">
          {COPY.reportsHint} {COPY.reportHint}
        </p>
      </div>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
      {data && held.length === 0 ? (
        <p className="text-muted-foreground text-xs">{COPY.reportsEmpty}</p>
      ) : null}
      {held.map((open) => (
        <div key={open.viewingSessionId} className="flex flex-wrap items-start gap-3 rounded-lg border p-3">
          <OpenSummary open={open} />
          <OpenReportButtons open={open} actions={actions} />
        </div>
      ))}
    </div>
  );
}
