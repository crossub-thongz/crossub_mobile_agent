'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Archive, ChevronDown, Home, Mail, Phone, Pin, PinOff, Plus, Trash2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { leasingDetail, vacatingDetail } from '@/constants/routes';
import {
  CURRENT_TENANCY_PIN_STALE_NOTE,
  OCCUPIED_LEASE_STATUSES,
  OVERVIEW_ACTION,
  OVERVIEW_COPY,
  OVERVIEW_LABEL,
  TENANCY_ALERT_TEXT_TONE,
  TENANCY_CARD_ICON_TONE,
  TENANCY_CARD_WASH,
  TENANCY_EMPTY_STATE,
  TENANCY_EMPTY_STATE_KIND,
  TENANCY_EMPTY_STATE_TONE,
  TENANCY_LEASE_TERM_TYPE,
  TENANCY_LEASE_TERM_TYPE_LABEL,
  TENANCY_MEMBER_AVATAR_TONE,
  TENANCY_PIN_STALE_TONE,
  TENANCY_PLACEHOLDER,
  TENANCY_ROW_GROUP,
  TENANCY_ROW_KIND,
  TENANCY_ROW_STATUS,
  TENANCY_SECTION_COPY as COPY,
} from '@/constants/property-tenancies';
import { setCurrentPropertyTenancy } from '@/lib/crossub-api/agent-client';
import type { PropertyTenancyOverview } from '@/lib/crossub-api/agent-tenancy-client';
import { fromProperty } from '@/lib/detail-navigation';
import { formatAgreementDate, formatDateMedium } from '@/lib/format-datetime';
import type { Property } from '@/lib/types';
import { cn, formatCurrency } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import {
  buildPropertyTenancyGroups,
  removableManualLeaseIds,
  selectCurrentTenancyGroup,
  selectIncomingTenancyGroups,
  selectPastTenancyGroups,
  type PropertyTenancyGroup,
  type PropertyTenancyMember,
} from '@/utils/property-tenancy-groups';
import { canArchiveTenant } from '@/utils/property-tenancy-rows';

import { AddTenancyDialog } from './add-tenancy-dialog';
import {
  ArchiveTenancyDialog,
  RemoveTenancyDialog,
  RestoreTenancyDialog,
  WithdrawIncomingTenancyDialog,
} from './tenancy-action-dialogs';
import { TenantDetailsDialog, type TenantDetailsTarget } from './tenant-details-dialog';
import {
  CardLink,
  MicroHeading,
  PersonAvatar,
  PrimaryTag,
  TenancyActionsMenu,
  TenancyStatusBadge,
  type TenancyMenuItem,
} from './tenancy-ui';

const linkClass = 'text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline';

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

function termLabel(group: PropertyTenancyGroup): string {
  const start = group.leaseStartDate ? formatDateMedium(group.leaseStartDate) : TENANCY_PLACEHOLDER;
  const end = group.leaseEndDate ? formatDateMedium(group.leaseEndDate) : COPY.PRESENT;
  return `${start} ${COPY.PERIOD_SEPARATOR} ${end}`;
}

/** "26 Aug 2025 → 24 Aug 2026 · $1,500.00/wk · Bond $6,000.00 · 4 tenants" */
function summaryLine(group: PropertyTenancyGroup): string {
  const parts = [termLabel(group)];
  if (group.rentWeekly != null && group.rentWeekly > 0) {
    parts.push(`${formatCurrency(group.rentWeekly)}${COPY.PER_WEEK}`);
  }
  if (group.bondAmount != null && group.bondAmount > 0) {
    parts.push(`${COPY.BOND_PREFIX} ${formatCurrency(group.bondAmount)}`);
  }
  if (group.members.length > 0) parts.push(plural(group.members.length, COPY.TENANT, COPY.TENANTS));
  return parts.join(' · ');
}

type Handlers = {
  record: PropertyTenancyOverview;
  propertyId: string;
  pinBusy: boolean;
  onPin: (tenancyId: string | null) => void;
  onArchive: () => void;
  onRestore: (group: PropertyTenancyGroup) => void;
  onWithdraw: (group: PropertyTenancyGroup) => void;
  onRemove: (group: PropertyTenancyGroup) => void;
  onEditMember: (member: PropertyTenancyMember) => void;
};

/** The household's actions, once per tenancy. The rare ones sit under ⋯. */
function TenancyActions({ group, ...h }: Handlers & { group: PropertyTenancyGroup }) {
  const nav = fromProperty(h.propertyId);
  const links: ReactNode[] = [];
  if (group.leasingCaseId) {
    links.push(
      <Link key="cycle" href={leasingDetail(group.leasingCaseId, nav)} className={linkClass}>
        {COPY.OPEN_LEASING_CYCLE}
      </Link>,
    );
  }
  if (group.terminationCaseId) {
    links.push(
      <Link key="end" href={vacatingDetail(group.terminationCaseId, nav)} className={linkClass}>
        {COPY.OPEN_END_LEASING}
      </Link>,
    );
  }

  const menu: TenancyMenuItem[] = [];
  if (group.group === TENANCY_ROW_GROUP.CURRENT && canArchiveTenant(h.record)) {
    menu.push({ key: 'archive', label: COPY.ARCHIVE_TENANCY, icon: Archive, onSelect: h.onArchive });
  }
  if (group.leaseId && group.canPinAsCurrent) {
    const leaseId = group.leaseId;
    menu.push({
      key: 'pin',
      label: group.pinnedAsCurrent ? COPY.UNPIN : COPY.PIN,
      icon: group.pinnedAsCurrent ? PinOff : Pin,
      disabled: h.pinBusy,
      onSelect: () => h.onPin(group.pinnedAsCurrent ? null : leaseId),
    });
  }
  if (group.restoreArchivedAt && !canArchiveTenant(h.record)) {
    menu.push({ key: 'restore', label: COPY.RESTORE, icon: Undo2, onSelect: () => h.onRestore(group) });
  }
  if (group.group === TENANCY_ROW_GROUP.INCOMING && group.leasingCaseId) {
    menu.push({ key: 'withdraw', label: COPY.WITHDRAW_INCOMING, icon: Archive, onSelect: () => h.onWithdraw(group) });
  }
  if (removableManualLeaseIds(group).length > 0) {
    menu.push({ key: 'remove', label: COPY.REMOVE_TENANCY, icon: Trash2, onSelect: () => h.onRemove(group) });
  }

  if (links.length === 0 && menu.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {links}
      <TenancyActionsMenu items={menu} />
    </div>
  );
}

function HouseholdMember({
  member,
  onEdit,
}: {
  member: PropertyTenancyMember;
  onEdit?: () => void;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <PersonAvatar name={member.name} tone={TENANCY_MEMBER_AVATAR_TONE} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">
          {member.name}
          {member.isPrimary ? <PrimaryTag label={COPY.PRIMARY} /> : null}
        </p>
        <p className="text-muted-foreground truncate text-xs">{member.mobile || TENANCY_PLACEHOLDER}</p>
        <p className="text-muted-foreground truncate text-xs">{member.email || TENANCY_PLACEHOLDER}</p>
        {onEdit ? <CardLink className="mt-1" label={`${OVERVIEW_ACTION.VIEW_CONTACT} ↗`} onClick={onEdit} /> : null}
      </div>
    </div>
  );
}

function MoneyCell({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="border-border px-3 py-2.5 [&:nth-child(odd)]:border-r [&:nth-child(-n+2)]:border-b">
      <MicroHeading>{label}</MicroHeading>
      <p className={cn('mt-1 text-base font-semibold tabular-nums', alert && TENANCY_ALERT_TEXT_TONE)}>{value}</p>
    </div>
  );
}

/** One household as a card: the current tenancy, or an upcoming one. */
function TenancyCard({ group, ...h }: Handlers & { group: PropertyTenancyGroup }) {
  const isCurrent = group.group === TENANCY_ROW_GROUP.CURRENT;
  const { record } = h;
  const periodic = group.status === TENANCY_ROW_STATUS.PERIODIC || !group.leaseEndDate;
  const agreement = TENANCY_LEASE_TERM_TYPE_LABEL[periodic ? TENANCY_LEASE_TERM_TYPE.PERIODIC : TENANCY_LEASE_TERM_TYPE.FIXED];
  const agreementHint = periodic
    ? OVERVIEW_COPY.NO_FIXED_END
    : group.leaseEndDate
      ? formatDateMedium(group.leaseEndDate)
      : undefined;
  const vacateSource = isCurrent
    ? (record.overview.vacateDate ?? group.recordedVacateDate)
    : (group.recordedVacateDate ?? group.moveOutDate);
  const rent = group.rentWeekly ?? (isCurrent ? record.financial.currentRentWeekly : null);
  const bond = group.bondAmount ?? (isCurrent ? record.financial.bondAmount : null);
  const paidTo = isCurrent ? (record.overview.rentPaidUntilDate ?? group.rentPaidUntil) : group.rentPaidUntil;
  const arrears = isCurrent ? record.arrears.outstandingAmount : null;
  return (
    <div className="v2-dashboard__card overflow-hidden rounded-2xl border">
      <div
        className={cn(
          'flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b bg-gradient-to-r px-4 py-3',
          TENANCY_CARD_WASH[group.group],
        )}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Home className={cn('size-4', TENANCY_CARD_ICON_TONE)} aria-hidden />
          <p className="text-base font-semibold tracking-tight">{isCurrent ? COPY.CURRENT : COPY.INCOMING}</p>
          <TenancyStatusBadge status={group.status} label={group.statusLabel} />
          {group.pinnedAsCurrent ? (
            <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
              <Pin className="size-3" aria-hidden />
              {COPY.PINNED}
            </span>
          ) : null}
        </div>
        <TenancyActions group={group} {...h} />
      </div>
      <div className="space-y-4 px-4 py-4">
        <div>
          <MicroHeading>{OVERVIEW_LABEL.FINANCIAL_SUMMARY}</MicroHeading>
          <div className="bg-muted/20 mt-2 grid grid-cols-2 overflow-hidden rounded-xl border">
            <MoneyCell
              label={OVERVIEW_LABEL.CURRENT_RENT}
              value={rent != null && rent > 0 ? `${formatCurrency(rent)} ${COPY.PER_WEEK}` : TENANCY_PLACEHOLDER}
            />
            <MoneyCell label={OVERVIEW_LABEL.PAID_TO} value={paidTo ? formatDateMedium(paidTo) : TENANCY_PLACEHOLDER} />
            <MoneyCell
              label={OVERVIEW_LABEL.RENT_ARREARS}
              value={isCurrent ? formatCurrency(arrears) : TENANCY_PLACEHOLDER}
              alert={arrears != null && arrears > 0}
            />
            <MoneyCell label={OVERVIEW_LABEL.BOND} value={bond != null && bond > 0 ? formatCurrency(bond) : TENANCY_PLACEHOLDER} />
          </div>
        </div>

        <div>
          <MicroHeading>
            {OVERVIEW_LABEL.TENANTS}
            {group.members.length > 0 ? (
              <span className="ml-1.5 font-medium normal-case tracking-normal">
                {plural(group.members.length, COPY.PERSON, COPY.PEOPLE)}
              </span>
            ) : null}
          </MicroHeading>
          {group.members.length > 0 ? (
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {group.members.map((member) => (
                <HouseholdMember
                  key={member.id}
                  member={member}
                  onEdit={member.personId ? () => h.onEditMember(member) : undefined}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground mt-2 text-xs">
              {group.kind === TENANCY_ROW_KIND.PENDING_CYCLE ? COPY.APPLICANT_PENDING : TENANCY_PLACEHOLDER}
            </p>
          )}
        </div>

        <div className="border-t pt-4">
          <MicroHeading>{OVERVIEW_LABEL.AGREEMENT_DATES}</MicroHeading>
          <dl className="mt-3 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground text-xs">{OVERVIEW_LABEL.TENANCY_STARTED}</dt>
              <dd className="text-sm font-medium tabular-nums">
                {group.leaseStartDate ? formatDateMedium(group.leaseStartDate) : TENANCY_PLACEHOLDER}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">{OVERVIEW_LABEL.CURRENT_AGREEMENT}</dt>
              <dd className="text-sm font-medium">{agreement}</dd>
              {agreementHint ? <dd className="text-muted-foreground text-xs">{agreementHint}</dd> : null}
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">{OVERVIEW_LABEL.VACATE_DATE}</dt>
              <dd className="text-sm font-medium tabular-nums">
                {vacateSource ? formatDateMedium(vacateSource) : OVERVIEW_COPY.NOT_SCHEDULED}
              </dd>
            </div>
          </dl>
          {group.movedOutReason ? (
            <p className="text-muted-foreground mt-2 text-[11px]">{group.movedOutReason}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** A previous household, folded to one line until opened. */
function PastTenancyRow({ group, ...h }: Handlers & { group: PropertyTenancyGroup }) {
  const [open, setOpen] = useState(false);
  const label = group.members.map((m) => m.name).join(' & ') || TENANCY_PLACEHOLDER;
  const archived = group.status === TENANCY_ROW_STATUS.ARCHIVED;
  return (
    <div>
      <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5', archived && 'bg-muted/60')}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <ChevronDown
            className={cn('text-muted-foreground size-4 shrink-0 transition-transform', open && 'rotate-180')}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className={cn('truncate text-sm font-medium', archived && 'text-muted-foreground')}>{label}</p>
            <p className="text-muted-foreground truncate text-xs tabular-nums">{summaryLine(group)}</p>
            {group.moveOutDate ? (
              <p className={cn('text-xs font-medium', TENANCY_ALERT_TEXT_TONE)}>
                {COPY.MOVE_OUT} {formatAgreementDate(group.moveOutDate)}
              </p>
            ) : null}
            {group.movedOutReason ? (
              <p className="text-muted-foreground text-[11px]">{group.movedOutReason}</p>
            ) : null}
          </div>
        </button>
        <TenancyStatusBadge status={group.status} label={archived ? COPY.ARCHIVED_LABEL : COPY.ENDED} />
        <TenancyActions group={group} {...h} />
      </div>
      {open ? (
        <ul className="bg-muted/10 divide-y border-t">
          {group.members.map((member) => (
            <li key={member.id} className="flex items-center gap-3 px-4 py-2">
              <PersonAvatar name={member.name} tone="bg-muted text-muted-foreground" small />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {member.name}
                  {member.isPrimary ? <PrimaryTag label={COPY.PRIMARY} /> : null}
                </p>
                <div className="text-muted-foreground mt-0.5 flex min-w-0 flex-wrap gap-x-3 gap-y-0.5 text-xs">
                  {member.mobile ? (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="size-3" aria-hidden />
                      {member.mobile}
                    </span>
                  ) : null}
                  {member.email ? (
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <Mail className="size-3 shrink-0" aria-hidden />
                      <span className="truncate">{member.email}</span>
                    </span>
                  ) : null}
                  {!member.mobile && !member.email ? <span>{TENANCY_PLACEHOLDER}</span> : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function PastTenancies({ groups, handlers }: { groups: PropertyTenancyGroup[]; handlers: Handlers }) {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? groups.filter(
        (group) =>
          group.members.some((member) => member.name.toLowerCase().includes(needle)) ||
          group.leaseId?.toLowerCase().includes(needle),
      )
    : groups;
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
          {COPY.PREVIOUS}
          <span className="ml-1.5 font-medium normal-case tracking-normal">
            {plural(groups.length, COPY.RECORD, COPY.RECORDS)}
          </span>
        </p>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={COPY.PAST_SEARCH}
          aria-label={COPY.PAST_SEARCH}
          className="h-8 w-full sm:w-56"
        />
      </div>
      {visible.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-6 text-center text-sm">
          {COPY.PAST_NO_MATCH}
        </p>
      ) : (
        <div className="v2-dashboard__card divide-y overflow-hidden rounded-2xl border">
          {visible.map((group) => (
            <PastTenancyRow key={group.id} group={group} {...handlers} />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Tenancies (Self-Manage): the admin Property Portal's Tenancies tab as redesigned in PR #37 —
 * current tenancy, upcoming tenancy, past tenancies with search — with Add tenancy, Archive
 * tenancy, Set as current / Use lease dates, Restore tenant, Archive incoming tenancy and Remove
 * tenancy.
 */
export function PropertyTenanciesSection({
  property,
  record,
  onChanged,
}: {
  property: Property;
  record: PropertyTenancyOverview;
  onChanged: () => void;
}) {
  const groups = useMemo(() => buildPropertyTenancyGroups(record), [record]);
  const incoming = useMemo(() => selectIncomingTenancyGroups(groups), [groups]);
  const currentGroup = useMemo(() => selectCurrentTenancyGroup(groups), [groups]);
  const past = useMemo(() => selectPastTenancyGroups(groups), [groups]);
  const [addOpen, setAddOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [restoreGroup, setRestoreGroup] = useState<PropertyTenancyGroup | null>(null);
  const [withdrawGroup, setWithdrawGroup] = useState<PropertyTenancyGroup | null>(null);
  const [removeGroup, setRemoveGroup] = useState<PropertyTenancyGroup | null>(null);
  const [memberEdit, setMemberEdit] = useState<TenantDetailsTarget | null>(null);
  const [pinBusy, setPinBusy] = useState(false);
  const pinStaleReason = record.currentTenancy?.pinStaleReason;
  const pinStaleNote = pinStaleReason ? CURRENT_TENANCY_PIN_STALE_NOTE[pinStaleReason] : null;
  const emptyStateKey = OCCUPIED_LEASE_STATUSES.includes(property.leaseStatus)
    ? TENANCY_EMPTY_STATE_KIND.OCCUPIED_UNRECORDED
    : TENANCY_EMPTY_STATE_KIND.NEVER_LET;
  const emptyState = TENANCY_EMPTY_STATE[emptyStateKey];
  const registryTerm = [record.overview.leaseStartDate, record.overview.leaseEndDate]
    .filter((d): d is string => Boolean(d))
    .map((d) => formatDateMedium(d))
    .join(` ${COPY.PERIOD_SEPARATOR} `);

  const handlePin = async (tenancyId: string | null) => {
    setPinBusy(true);
    try {
      const result = await setCurrentPropertyTenancy(record.propertyId, tenancyId);
      toast.success(
        tenancyId
          ? `${COPY.PIN_SET} ${result.tenantName?.trim() || COPY.PIN_FALLBACK_NAME}`
          : COPY.PIN_CLEARED,
      );
      onChanged();
    } catch (err) {
      toast.error(apiErrorMessage(err, COPY.PIN_FAILED));
    } finally {
      setPinBusy(false);
    }
  };

  const handlers: Handlers = {
    record,
    propertyId: record.propertyId,
    pinBusy,
    onPin: (tenancyId) => void handlePin(tenancyId),
    onArchive: () => setArchiveOpen(true),
    onRestore: setRestoreGroup,
    onWithdraw: setWithdrawGroup,
    onRemove: setRemoveGroup,
    onEditMember: (member) =>
      member.personId
        ? setMemberEdit({ personId: member.personId, name: member.name, email: member.email, mobile: member.mobile })
        : undefined,
  };

  const addButton = (
    <Button type="button" size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
      <Plus className="size-3.5" />
      {COPY.ADD_TENANCY}
    </Button>
  );

  return (
    <>
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{COPY.TITLE}</h2>
          <p className="text-muted-foreground max-w-2xl text-sm">{COPY.INTRO}</p>
          <div className="mt-3">{addButton}</div>
        </div>

        {pinStaleNote ? (
          <div className={cn('rounded-xl border px-4 py-2.5 text-xs', TENANCY_PIN_STALE_TONE)}>{pinStaleNote}</div>
        ) : null}

        {groups.length === 0 ? (
          <div className={cn('rounded-xl border border-dashed px-6 py-10 text-center', TENANCY_EMPTY_STATE_TONE[emptyStateKey])}>
            <Home className="text-muted-foreground/70 mx-auto size-8" />
            <p className="mt-3 text-sm font-medium">{emptyState.title}</p>
            <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">{emptyState.body}</p>
            {emptyStateKey === TENANCY_EMPTY_STATE_KIND.OCCUPIED_UNRECORDED && registryTerm ? (
              <p className="text-muted-foreground mt-2 text-xs tabular-nums">
                {COPY.REGISTRY_TERM} {registryTerm}
              </p>
            ) : null}
            <div className="mt-4">{addButton}</div>
          </div>
        ) : (
          <>
            <section className="space-y-2">
              {currentGroup ? (
                <TenancyCard group={currentGroup} {...handlers} />
              ) : (
                <div className="bg-muted/10 rounded-xl border border-dashed px-4 py-6 text-center">
                  <p className="text-sm font-medium">{COPY.VACANT}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {incoming.length > 0 ? COPY.VACANT_INCOMING : COPY.VACANT_HINT}
                  </p>
                </div>
              )}
            </section>

            {incoming.length > 0 ? (
              <section className="space-y-2">
                {incoming.map((group) => (
                  <TenancyCard key={group.id} group={group} {...handlers} />
                ))}
              </section>
            ) : null}

            {past.length > 0 ? <PastTenancies groups={past} handlers={handlers} /> : null}
          </>
        )}
      </div>

      <AddTenancyDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        propertyId={record.propertyId}
        agencyId={property.agencyId}
        onSaved={onChanged}
      />
      <ArchiveTenancyDialog open={archiveOpen} onOpenChange={setArchiveOpen} record={record} onDone={onChanged} />
      <RestoreTenancyDialog
        open={restoreGroup != null}
        onOpenChange={(next) => (next ? undefined : setRestoreGroup(null))}
        propertyId={record.propertyId}
        tenantName={restoreGroup?.members.map((m) => m.name).join(' & ') || undefined}
        archivedAt={restoreGroup?.restoreArchivedAt}
        onDone={onChanged}
      />
      <WithdrawIncomingTenancyDialog
        open={withdrawGroup != null}
        onOpenChange={(next) => (next ? undefined : setWithdrawGroup(null))}
        propertyId={record.propertyId}
        group={withdrawGroup}
        onDone={onChanged}
      />
      <RemoveTenancyDialog
        open={removeGroup != null}
        onOpenChange={(next) => (next ? undefined : setRemoveGroup(null))}
        propertyId={record.propertyId}
        group={removeGroup}
        onDone={onChanged}
      />
      <TenantDetailsDialog
        propertyId={record.propertyId}
        target={memberEdit}
        onOpenChange={(next) => (next ? undefined : setMemberEdit(null))}
        onSaved={onChanged}
      />
    </>
  );
}
