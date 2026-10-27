'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Home, KeyRound, Users } from 'lucide-react';
import { toast } from 'sonner';

import { PropertyBondEditDialog } from '@/components/agent/property-bond-edit-dialog';
import { PropertyBuildingContactsDialog } from '@/components/agent/property-building-contacts-dialog';
import { PropertyFactsEditDialog } from '@/components/agent/property-facts-edit-dialog';
import { PropertyProfileInfoCard } from '@/components/agent/property-profile/property-profile-info-card';
import { PROPERTY_TYPE_LABEL, type PropertyType } from '@/constants/api-enums';
import { PROPERTY_CONTACT_ROLE } from '@/constants/property-contact';
import {
  PROPERTY_RENT_PERIOD,
  PROPERTY_RENT_PERIOD_LABEL,
} from '@/constants/property-profile-edit';
import {
  BOND_PANEL_COPY,
  HOUSEHOLD_PREVIEW_COUNT,
  KEY_FOB_COPY,
  OVERVIEW_ACTION,
  OVERVIEW_CARD_TITLE,
  OVERVIEW_CARD_TONE,
  OVERVIEW_COPY,
  OVERVIEW_LABEL,
  PORTAL_INVITE_COPY,
  RENT_PERIOD_SUFFIX,
  TENANCY_LEASE_TERM_TYPE,
  TENANCY_LEASE_TERM_TYPE_LABEL,
  TENANCY_PLACEHOLDER,
  TENANCY_ROW_STATUS,
  TENANCY_ROW_STATUS_TONE,
  TENANCY_SECTION_COPY,
} from '@/constants/property-tenancies';
import { vacatingDetail } from '@/constants/routes';
import { sendTenantLogin } from '@/lib/crossub-api/agent-client';
import type {
  PropertyTenancyContact,
  PropertyTenancyOverview,
  PropertyTenancyParty,
} from '@/lib/crossub-api/agent-tenancy-client';
import { fromProperty } from '@/lib/detail-navigation';
import { formatDateMedium } from '@/lib/format-datetime';
import { resolveBondOverviewDisplay } from '@/lib/property-overview';
import type { PropertyBondSnapshot } from '@/lib/use-property-overview-sync';
import type { Property } from '@/lib/types';
import { cn, formatCurrency } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { isSamePortalParty, resolvePortalCoContacts } from '@/utils/portal-party';
import {
  buildPropertyTenancyGroups,
  formatHouseholdLabel,
  selectCurrentTenancyGroup,
  selectIncomingTenancyGroups,
  type PropertyTenancyGroup,
  type PropertyTenancyMember,
} from '@/utils/property-tenancy-groups';
import {
  isPastPropertyDay,
  rentAmountForPeriod,
  resolveCurrentLeaseTerm,
  resolveLeaseTermType,
  resolvePreviousFixedTermEnd,
  resolveTenancyVacateDate,
  resolveUpcomingAcceptedRentChange,
} from '@/utils/property-tenancy-overview';

import { EditOwnersDialog, type OwnerParty } from './edit-owners-dialog';
import { EditTenancyDialog } from './edit-tenancy-dialog';
import { PaymentReferenceDialog } from './payment-reference-dialog';
import { TenantDetailsDialog, type TenantDetailsTarget } from './tenant-details-dialog';
import {
  CardLink,
  DateFact,
  FieldLabel,
  Fold,
  Metric,
  MicroHeading,
  PersonAvatar,
  PrimaryTag,
} from './tenancy-ui';

function hasPartyName(name: string | null | undefined): name is string {
  const trimmed = name?.trim();
  return Boolean(trimmed) && trimmed !== TENANCY_PLACEHOLDER;
}

function overviewDate(value?: string | null): string {
  return value ? formatDateMedium(value) : TENANCY_PLACEHOLDER;
}

function propertyTypeLabel(value?: string): string {
  if (!value?.trim()) return TENANCY_PLACEHOLDER;
  const key = value.trim().toUpperCase() as PropertyType;
  return PROPERTY_TYPE_LABEL[key] ?? value.replace(/_/g, ' ');
}

function countLabel(value: number | undefined): string {
  return value == null ? TENANCY_PLACEHOLDER : String(value);
}

/** The tenant contact row behind a household member, for "Send portal invite". */
function contactForMember(
  contacts: readonly PropertyTenancyContact[],
  member: PropertyTenancyMember,
): PropertyTenancyContact | undefined {
  const tenants = contacts.filter((c) => c.role === PROPERTY_CONTACT_ROLE.TENANT);
  return (
    (member.personId ? tenants.find((c) => c.personId === member.personId) : undefined) ??
    tenants.find((c) => isSamePortalParty(c, member))
  );
}

function ContactColumn({
  label,
  contact,
  onEdit,
}: {
  label: string;
  contact: PropertyTenancyParty | null;
  onEdit: () => void;
}) {
  if (!hasPartyName(contact?.name)) {
    return (
      <div>
        <FieldLabel>{label}</FieldLabel>
        <CardLink className="mt-1.5 text-sm" label={OVERVIEW_ACTION.ADD_CONTACT} onClick={onEdit} />
      </div>
    );
  }
  const detail = [contact.mobile, contact.email].filter(Boolean).join(' · ');
  return (
    <div className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <p className="mt-1.5 truncate text-sm font-medium">{contact.name}</p>
      {detail ? <p className="text-muted-foreground truncate text-xs">{detail}</p> : null}
      <CardLink className="mt-0.5" label={OVERVIEW_ACTION.EDIT} onClick={onEdit} />
    </div>
  );
}

function Count({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-lg font-semibold tabular-nums">{value}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </span>
  );
}

function TenantBlock({
  member,
  onView,
  invite,
}: {
  member: PropertyTenancyMember;
  onView?: () => void;
  invite?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <PersonAvatar name={member.name} tone={OVERVIEW_CARD_TONE.TENANCY.avatar} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">
          {member.name}
          {member.isPrimary ? <PrimaryTag label={OVERVIEW_LABEL.PRIMARY} /> : null}
        </p>
        <p className="text-muted-foreground truncate text-xs">{member.mobile || TENANCY_PLACEHOLDER}</p>
        <p className="text-muted-foreground truncate text-xs">{member.email || TENANCY_PLACEHOLDER}</p>
        <div className="mt-1 flex flex-wrap gap-3">
          {onView ? <CardLink label={`${OVERVIEW_ACTION.VIEW_CONTACT} ↗`} onClick={onView} /> : null}
          {invite}
        </div>
      </div>
    </div>
  );
}

function IncomingStrip({ incoming }: { incoming: PropertyTenancyGroup }) {
  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2 text-sm font-semibold',
        TENANCY_ROW_STATUS_TONE[TENANCY_ROW_STATUS.INCOMING],
      )}
    >
      {OVERVIEW_COPY.MOVING_IN} {overviewDate(incoming.leaseStartDate)}:{' '}
      {formatHouseholdLabel(incoming.members, HOUSEHOLD_PREVIEW_COUNT)}
    </div>
  );
}

/**
 * Self-Manage Overview (Daniel, 27 Oct 2026): the admin Property Portal's Property, Tenancy and
 * Owner cards. Edits go through the agent property, contact and tenant routes; "Tenancy history"
 * and "Start new tenancy" open the Tenancies section.
 */
export function SelfManagedOverviewCards({
  property,
  record,
  onChanged,
  onOpenTenancies,
  onOpenFinancials,
  bond,
  hasActiveLeasingCycle,
  keyFobCount,
}: {
  property: Property;
  record: PropertyTenancyOverview;
  onChanged: () => void;
  onOpenTenancies: () => void;
  /** Absent when this agent has no Financials section. */
  onOpenFinancials?: () => void;
  /** The letting's bond lodgement, as the profile already reads it. */
  bond: PropertyBondSnapshot | null;
  hasActiveLeasingCycle: boolean;
  keyFobCount: number | null;
}) {
  const { overview, financial } = record;
  const [factsOpen, setFactsOpen] = useState(false);
  const [buildingOpen, setBuildingOpen] = useState(false);
  const [tenancyEditOpen, setTenancyEditOpen] = useState(false);
  const [ownersOpen, setOwnersOpen] = useState(false);
  const [paymentRefOpen, setPaymentRefOpen] = useState(false);
  const [bondOpen, setBondOpen] = useState(false);
  const [detailsEdit, setDetailsEdit] = useState<TenantDetailsTarget | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);

  const groups = useMemo(() => buildPropertyTenancyGroups(record), [record]);
  const currentTenancy = useMemo(() => selectCurrentTenancyGroup(groups), [groups]);
  const incomingTenancy = useMemo(() => selectIncomingTenancyGroups(groups)[0], [groups]);
  const primaryMember = currentTenancy?.members.find((m) => m.isPrimary);
  const primaryContact = primaryMember ? contactForMember(record.contacts, primaryMember) : undefined;
  const canInvite = Boolean(primaryMember?.email?.includes('@'));

  const registryOwner: OwnerParty | null = hasPartyName(property.homeOwnerName)
    ? {
        name: property.homeOwnerName,
        email: property.homeOwnerContact?.email,
        mobile: property.homeOwnerContact?.phone,
      }
    : null;
  const owners: OwnerParty[] = registryOwner
    ? [
        registryOwner,
        ...resolvePortalCoContacts(record.contacts, PROPERTY_CONTACT_ROLE.LANDLORD, registryOwner).map((c) => ({
          name: c.name ?? TENANCY_PLACEHOLDER,
          email: c.email ?? undefined,
          mobile: c.mobile ?? undefined,
        })),
      ]
    : [];
  const primaryOwner = owners[0];
  const ownerNames = owners.map((o) => o.name).join(' & ');

  const term = resolveCurrentLeaseTerm(record, currentTenancy, Boolean(incomingTenancy));
  const leaseTermType = resolveLeaseTermType(record, currentTenancy, term);
  const previousFixedEnd = resolvePreviousFixedTermEnd(record, currentTenancy, leaseTermType, term);
  const vacateDate = resolveTenancyVacateDate(record);
  const rentPeriod = property.rentPeriod ?? PROPERTY_RENT_PERIOD.WEEKLY;
  const weeklyRent = financial.currentRentWeekly;
  const rentFigure =
    weeklyRent != null && weeklyRent > 0
      ? formatCurrency(rentAmountForPeriod(weeklyRent, rentPeriod))
      : null;
  const upcomingRent = resolveUpcomingAcceptedRentChange(record.leasingCases, weeklyRent);
  const rentHint = upcomingRent
    ? `${formatCurrency(upcomingRent.newRent)}${TENANCY_SECTION_COPY.PER_WEEK} ${OVERVIEW_COPY.RENT_FROM} ${formatDateMedium(upcomingRent.startDate)}`
    : undefined;
  // Rent only; invoices are their own figure (the outstanding total is both together).
  const arrears = record.arrears.rentArrears;
  const unpaidInvoices = record.arrears.invoiceArrears;
  const bondAmount = financial.bondAmount ?? property.bondAmount ?? null;
  const bondOverview = resolveBondOverviewDisplay(bondAmount, bond, hasActiveLeasingCycle);
  const bondIdLabel = bondOverview.bondIdLabel !== TENANCY_PLACEHOLDER ? bondOverview.bondIdLabel : null;
  const inspectionCadence =
    overview.routineInspectionFrequencyMonths != null
      ? `${OVERVIEW_COPY.EVERY_MONTHS_PREFIX} ${overview.routineInspectionFrequencyMonths} ${OVERVIEW_COPY.EVERY_MONTHS_SUFFIX}`
      : overview.routineInspectionFrequency != null
        ? `${overview.routineInspectionFrequency}${OVERVIEW_COPY.PER_YEAR_SUFFIX}`
        : undefined;
  const buildingName = overview.buildingName ?? property.buildingName;
  const strataPlan = overview.strataPlanNumber ?? property.strataPlanNumber;
  const buildingLine = [buildingName?.trim(), strataPlan?.trim() ? `SP ${strataPlan.trim()}` : '']
    .filter(Boolean)
    .join(' · ');
  const furnished = overview.furnished ?? property.furnished;
  const propertyManager =
    property.assignedPortalAgentName?.trim() || property.accountManagerName?.trim() || '';

  const editMember = (member: PropertyTenancyMember) =>
    member.personId
      ? setDetailsEdit({ personId: member.personId, name: member.name, email: member.email, mobile: member.mobile })
      : undefined;

  const invitePrimary = async () => {
    if (!primaryContact) {
      toast.error(PORTAL_INVITE_COPY.NO_CONTACT);
      return;
    }
    setInviteBusy(true);
    try {
      const sent = await sendTenantLogin(record.propertyId, primaryContact.id);
      toast.success(`${PORTAL_INVITE_COPY.SENT} ${sent.email}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, PORTAL_INVITE_COPY.FAILED));
    } finally {
      setInviteBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <PropertyProfileInfoCard
        title={OVERVIEW_CARD_TITLE.PROPERTY}
        icon={Home}
        onEdit={() => setFactsOpen(true)}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="bg-muted/60 rounded-md border px-2.5 py-1 text-xs font-medium">
              {propertyTypeLabel(property.propertyType)}
            </span>
            <Count label={OVERVIEW_LABEL.BEDROOMS} value={countLabel(property.bedrooms)} />
            <Count label={OVERVIEW_LABEL.BATHROOMS} value={countLabel(property.bathrooms)} />
            <Count label={OVERVIEW_LABEL.CAR_SPACES} value={countLabel(property.carSpaces)} />
            {keyFobCount != null ? (
              <span className="inline-flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">{KEY_FOB_COPY.LABEL}</span>
                <span className="font-semibold">
                  {keyFobCount} {keyFobCount === 1 ? KEY_FOB_COPY.ONE : KEY_FOB_COPY.MANY}
                </span>
              </span>
            ) : null}
            <span className="inline-flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">{OVERVIEW_LABEL.FURNISHED}</span>
              <span className="font-semibold">
                {furnished == null ? TENANCY_PLACEHOLDER : furnished ? OVERVIEW_COPY.YES : OVERVIEW_COPY.NO}
              </span>
            </span>
          </div>
          <p className="text-muted-foreground text-xs">
            {OVERVIEW_LABEL.PROPERTY_REFERENCE}
            <span className="text-foreground ml-1.5 font-medium tabular-nums">{record.propertyReference}</span>
          </p>
        </div>

        <div className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-3">
          <div className="min-w-0">
            <FieldLabel>{OVERVIEW_LABEL.ASSIGNED_PROPERTY_MANAGER}</FieldLabel>
            <div className="mt-1.5 flex items-center gap-2">
              <PersonAvatar name={propertyManager || TENANCY_PLACEHOLDER} tone={OVERVIEW_CARD_TONE.PROPERTY.avatar} small />
              <span className="truncate text-sm font-medium">{propertyManager || TENANCY_PLACEHOLDER}</span>
            </div>
          </div>
          <ContactColumn
            label={OVERVIEW_LABEL.BUILDING_MANAGER}
            contact={overview.buildingManager}
            onEdit={() => setBuildingOpen(true)}
          />
          <ContactColumn
            label={OVERVIEW_LABEL.STRATA_CONTACT}
            contact={overview.strataContact}
            onEdit={() => setBuildingOpen(true)}
          />
        </div>

        <div className="mt-4">
          <Fold title={OVERVIEW_COPY.MORE_PROPERTY_DETAILS}>
            <FieldLabel>{OVERVIEW_LABEL.BUILDING}</FieldLabel>
            <p className="mt-1 text-sm font-medium">
              {buildingLine || <span className="text-muted-foreground font-normal">{OVERVIEW_COPY.NOT_RECORDED}</span>}
            </p>
          </Fold>
        </div>
      </PropertyProfileInfoCard>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <PropertyProfileInfoCard
          title={OVERVIEW_CARD_TITLE.TENANCY}
          icon={Users}
          onEdit={currentTenancy ? () => setTenancyEditOpen(true) : undefined}
          headerExtra={
            currentTenancy ? (
              currentTenancy.terminationCaseId ? (
                <Link
                  href={vacatingDetail(currentTenancy.terminationCaseId, fromProperty(record.propertyId))}
                  className={cn(
                    'shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold hover:opacity-80',
                    TENANCY_ROW_STATUS_TONE[currentTenancy.status],
                  )}
                >
                  {currentTenancy.statusLabel}
                </Link>
              ) : (
                <span
                  className={cn(
                    'shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                    TENANCY_ROW_STATUS_TONE[currentTenancy.status],
                  )}
                >
                  {currentTenancy.statusLabel}
                </span>
              )
            ) : undefined
          }
          footer={
            <div className="flex justify-end">
              <CardLink
                label={currentTenancy ? OVERVIEW_ACTION.TENANCY_HISTORY : OVERVIEW_ACTION.START_TENANCY}
                onClick={onOpenTenancies}
              />
            </div>
          }
        >
          {currentTenancy ? (
            <div className="space-y-4">
              <p className="text-sm font-semibold">
                {OVERVIEW_LABEL.CURRENT_TENANCY}
                <PrimaryTag
                  label={`${currentTenancy.members.length} ${
                    currentTenancy.members.length === 1 ? TENANCY_SECTION_COPY.TENANT : TENANCY_SECTION_COPY.TENANTS
                  }`}
                />
              </p>

              <div className="flex items-center justify-between gap-3">
                <MicroHeading>{OVERVIEW_LABEL.FINANCIAL_SUMMARY}</MicroHeading>
                {onOpenFinancials ? (
                  <CardLink label={OVERVIEW_ACTION.VIEW_TENANT_LEDGER} onClick={onOpenFinancials} />
                ) : null}
              </div>
              <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-teal-700/10 bg-teal-500/[0.04]">
                <Metric
                  label={OVERVIEW_LABEL.CURRENT_RENT}
                  value={rentFigure ?? TENANCY_PLACEHOLDER}
                  suffix={rentFigure ? RENT_PERIOD_SUFFIX[rentPeriod] : undefined}
                  hint={rentHint}
                />
                <Metric
                  label={OVERVIEW_LABEL.PAID_TO}
                  value={overviewDate(overview.rentPaidUntilDate)}
                  muted={!overview.rentPaidUntilDate}
                />
                <Metric
                  label={OVERVIEW_LABEL.RENT_ARREARS}
                  value={formatCurrency(arrears)}
                  attention={arrears != null && arrears > 0}
                  muted={arrears == null}
                  onClick={onOpenFinancials}
                />
                <Metric
                  label={OVERVIEW_LABEL.UNPAID_INVOICES}
                  value={formatCurrency(unpaidInvoices)}
                  attention={unpaidInvoices != null && unpaidInvoices > 0}
                  muted={unpaidInvoices == null}
                  onClick={onOpenFinancials}
                />
              </div>

              <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-1 text-[11px]">
                <span>
                  {OVERVIEW_LABEL.DEPOSIT}{' '}
                  <strong className="text-foreground font-medium">{formatCurrency(financial.depositAmount)}</strong>
                </span>
                <button type="button" onClick={() => setPaymentRefOpen(true)} className="hover:text-foreground">
                  {OVERVIEW_LABEL.PAYMENT_REFERENCE}{' '}
                  <strong className="text-foreground font-medium">
                    {property.paymentReference || OVERVIEW_ACTION.SET_REFERENCE}
                  </strong>
                </button>
              </div>

              <div>
                <MicroHeading>{OVERVIEW_LABEL.TENANTS}</MicroHeading>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  {currentTenancy.members.map((member) => (
                    <TenantBlock
                      key={member.id}
                      member={member}
                      onView={member.personId ? () => editMember(member) : undefined}
                      invite={
                        member.isPrimary && canInvite ? (
                          <CardLink
                            label={inviteBusy ? OVERVIEW_ACTION.SENDING : OVERVIEW_ACTION.SEND_PORTAL_INVITE}
                            onClick={() => void invitePrimary()}
                            disabled={inviteBusy}
                          />
                        ) : null
                      }
                    />
                  ))}
                </div>
              </div>

              {incomingTenancy ? <IncomingStrip incoming={incomingTenancy} /> : null}
              {currentTenancy.movedOutReason ? (
                <p className="text-muted-foreground text-xs">{currentTenancy.movedOutReason}</p>
              ) : null}

              <div className="border-t pt-4">
                <MicroHeading>{OVERVIEW_LABEL.AGREEMENT_DATES}</MicroHeading>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <DateFact label={OVERVIEW_LABEL.TENANCY_STARTED} value={overviewDate(term.leaseStartDate)} />
                  <DateFact
                    label={OVERVIEW_LABEL.CURRENT_AGREEMENT}
                    value={leaseTermType ? TENANCY_LEASE_TERM_TYPE_LABEL[leaseTermType] : TENANCY_PLACEHOLDER}
                    hint={
                      leaseTermType === TENANCY_LEASE_TERM_TYPE.PERIODIC
                        ? OVERVIEW_COPY.NO_FIXED_END
                        : term.leaseEndDate
                          ? overviewDate(term.leaseEndDate)
                          : undefined
                    }
                  />
                  <DateFact label={OVERVIEW_LABEL.PREVIOUS_FIXED_TERM} value={overviewDate(previousFixedEnd)} />
                  <DateFact
                    label={OVERVIEW_LABEL.NEXT_RENT_REVIEW}
                    value={overviewDate(overview.nextRentReviewDate)}
                    flag={isPastPropertyDay(overview.nextRentReviewDate) ? OVERVIEW_COPY.CHECK_DATE : undefined}
                  />
                  <DateFact
                    label={OVERVIEW_LABEL.NEXT_ROUTINE_INSPECTION}
                    value={overviewDate(overview.nextRoutineInspectionDate)}
                    hint={inspectionCadence}
                  />
                  <DateFact
                    label={OVERVIEW_LABEL.VACATE_DATE}
                    value={vacateDate ? overviewDate(vacateDate) : OVERVIEW_COPY.NOT_SCHEDULED}
                    quiet={!vacateDate}
                    emphasis={Boolean(vacateDate)}
                  />
                </div>
              </div>

              <div className="bg-muted/30 flex items-center gap-3 rounded-lg border px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">
                    {OVERVIEW_LABEL.BOND} · {formatCurrency(bondAmount)}
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    {bondIdLabel
                      ? `${BOND_PANEL_COPY.BOND_ID} ${bondIdLabel}`
                      : bondAmount != null
                        ? `${OVERVIEW_COPY.RECORDED_AMOUNT} · ${OVERVIEW_COPY.LODGEMENT_NOT_PROVIDED}`
                        : OVERVIEW_COPY.NOT_RECORDED}
                  </p>
                </div>
                <CardLink label={OVERVIEW_ACTION.VIEW_DETAILS} onClick={() => setBondOpen(true)} />
              </div>

              <Fold title={OVERVIEW_COPY.ADDITIONAL_TENANCY}>
                <DateFact label={OVERVIEW_LABEL.PAYMENT_FREQUENCY} value={PROPERTY_RENT_PERIOD_LABEL[rentPeriod]} />
              </Fold>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-base font-semibold">{OVERVIEW_COPY.VACANT}</p>
              <p className="text-muted-foreground text-xs">{OVERVIEW_COPY.VACANT_HINT}</p>
              {incomingTenancy ? <IncomingStrip incoming={incomingTenancy} /> : null}
            </div>
          )}
        </PropertyProfileInfoCard>

        <PropertyProfileInfoCard
          title={OVERVIEW_CARD_TITLE.OWNER}
          icon={KeyRound}
          onEdit={() => setOwnersOpen(true)}
          footer={
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground text-xs">{OVERVIEW_COPY.OWNERSHIP_RECORD}</span>
              <CardLink label={OVERVIEW_ACTION.VIEW_OWNERSHIP} onClick={() => setOwnersOpen(true)} />
            </div>
          }
        >
          <div className="flex items-center justify-between gap-3">
            <MicroHeading>{OVERVIEW_LABEL.FINANCIAL_SUMMARY}</MicroHeading>
            {onOpenFinancials ? (
              <CardLink label={OVERVIEW_ACTION.VIEW_OWNER_LEDGER} onClick={onOpenFinancials} />
            ) : null}
          </div>
          <div className="mt-3 overflow-hidden rounded-xl border border-violet-500/15 bg-violet-500/[0.04]">
            <div className="grid grid-cols-2">
              <Metric label={OVERVIEW_LABEL.FUNDS_HELD} value={TENANCY_PLACEHOLDER} muted />
              <Metric label={OVERVIEW_LABEL.PENDING_PAYMENTS} value={TENANCY_PLACEHOLDER} muted />
            </div>
            <div className="flex items-center justify-between border-t border-violet-500/15 px-3 py-2.5">
              <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                {OVERVIEW_LABEL.AVAILABLE_TO_DISBURSE}
              </span>
              <span className="text-muted-foreground text-lg font-semibold tabular-nums">{TENANCY_PLACEHOLDER}</span>
            </div>
          </div>
          <div className="text-muted-foreground mt-2 flex flex-wrap justify-between gap-2 text-[11px]">
            <span>
              {OVERVIEW_LABEL.WITHHELD} <strong className="text-foreground font-medium">{TENANCY_PLACEHOLDER}</strong>
            </span>
            <span>
              {OVERVIEW_LABEL.NEXT_DISBURSEMENT}{' '}
              <strong className="text-foreground font-medium">{TENANCY_PLACEHOLDER}</strong>
            </span>
          </div>
          <p className="text-muted-foreground mt-2 text-[11px]">{OVERVIEW_COPY.TRUST_ACCOUNTING_NOTE}</p>

          <div className="mt-4 border-t pt-4">
            <MicroHeading>{OVERVIEW_LABEL.OWNER_CONTACTS}</MicroHeading>
            {primaryOwner ? (
              <div className="mt-3 space-y-3">
                <div className="flex items-center gap-2.5">
                  <PersonAvatar name={ownerNames} tone={OVERVIEW_CARD_TONE.OWNER.avatar} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{ownerNames}</p>
                    <p className="text-muted-foreground text-xs">
                      {OVERVIEW_COPY.PRIMARY_OWNERSHIP}
                      {owners.length > 1 ? ` · ${owners.length} ${OVERVIEW_COPY.OWNERS_SUFFIX}` : null}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-[5rem_1fr] gap-y-1.5 text-sm">
                  <FieldLabel>{OVERVIEW_LABEL.PHONE}</FieldLabel>
                  <p className="font-medium">{primaryOwner.mobile || TENANCY_PLACEHOLDER}</p>
                  <FieldLabel>{OVERVIEW_LABEL.EMAIL}</FieldLabel>
                  <p className="truncate font-medium">{primaryOwner.email || TENANCY_PLACEHOLDER}</p>
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-1">
                <p className="text-sm font-semibold">{OVERVIEW_COPY.NO_OWNER}</p>
                <CardLink label={OVERVIEW_ACTION.ADD_OWNER} onClick={() => setOwnersOpen(true)} />
              </div>
            )}
          </div>

          <div className="mt-4">
            <Fold title={OVERVIEW_COPY.PAYMENT_INSURANCE}>
              <DateFact label={OVERVIEW_LABEL.LANDLORD_INSURANCE} value={overviewDate(overview.landlordInsuranceExpiry)} />
            </Fold>
          </div>
        </PropertyProfileInfoCard>
      </div>

      <PropertyFactsEditDialog open={factsOpen} onOpenChange={setFactsOpen} property={property} onSaved={onChanged} />
      <PropertyBuildingContactsDialog
        open={buildingOpen}
        onOpenChange={setBuildingOpen}
        propertyId={record.propertyId}
        onSaved={onChanged}
      />
      <EditTenancyDialog
        open={tenancyEditOpen}
        onOpenChange={setTenancyEditOpen}
        property={property}
        record={record}
        onSaved={onChanged}
      />
      <EditOwnersDialog
        open={ownersOpen}
        onOpenChange={setOwnersOpen}
        property={property}
        record={record}
        registryOwner={registryOwner}
        onSaved={onChanged}
      />
      <PaymentReferenceDialog
        open={paymentRefOpen}
        onOpenChange={setPaymentRefOpen}
        propertyId={record.propertyId}
        current={property.paymentReference}
        onSaved={onChanged}
      />
      <TenantDetailsDialog
        propertyId={record.propertyId}
        target={detailsEdit}
        onOpenChange={(next) => (next ? undefined : setDetailsEdit(null))}
        onSaved={onChanged}
      />
      <PropertyBondEditDialog
        open={bondOpen}
        onOpenChange={setBondOpen}
        propertyId={record.propertyId}
        initialAmount={bondAmount}
        bondId={bondIdLabel}
        bondLodgementUrl={bond?.agentLink}
        onSaved={onChanged}
      />
    </div>
  );
}
