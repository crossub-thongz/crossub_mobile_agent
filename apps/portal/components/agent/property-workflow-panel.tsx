'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  createAgentLeasingCycle,
  createAgentMaintenanceRequest,
  createAgentRentReview,
  createAgentTerminationCase,
} from '@/lib/crossub-api/agent-workflow-client';
import { inspectionsApi } from '@/lib/inspections-api';
import { LEASING_LIFECYCLE_STEP } from '@/lib/leasing/constants';
import { leasingOpsApi } from '@/lib/leasing-ops-api';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import {
  buildIngoingInspectionPrefill,
  buildLeasingCyclePrefill,
  buildMaintenancePrefill,
  buildRentReviewPrefill,
  buildTerminationPrefill,
  fetchIngoingInspectionPrefill,
  fetchMaintenancePrefill,
  fetchRentReviewPrefill,
  fetchTerminationPrefill,
  recalcRentReviewLeaseStart,
  LEASING_CYCLE_AVAILABLE_FROM_MIN_DAYS,
  minLeasingCycleAvailableFrom,
} from '@/lib/property-form-prefill';
import { isPropertyVacant } from '@/lib/property-leasing';
import {
  buildPropertyWorkflowContext,
  tabActionsFor,
  type PropertyWorkflowAction,
  type PropertyWorkflowActionId,
  type PropertyWorkflowTab,
} from '@/lib/property-workflow-actions';
import type {
  Inspection,
  LeasingCycle,
  LeasingRecord,
  MaintenanceItem,
  Property,
  RentReviewCase,
  TenantSelectionCase,
  TribunalCase,
  VacatingCase,
} from '@/lib/types';
import { cn, formatDate, formatPropertyFullAddress } from '@/lib/utils';

import { TERMINATION_NOTICE_GROUND, TERMINATION_NOTICE_GROUND_OPTIONS, type TerminationNoticeGround } from '@/constants/end-leasing';
import { vacatingDetail, rentReviewDetail } from '@/constants/routes';
import { fromProperty } from '@/lib/detail-navigation';
import { RENT_PERIOD_OPTIONS } from '@/lib/rent-calculations';
import type { RentPeriod } from '@/lib/store';

type RentReviewCreatePath = 'crossub_managed' | 'landlord_agreed';
type RentReviewNegotiationChoice = 'negotiable' | 'not_negotiable';
type CrossubLeaseTermChoice = '26' | '52' | 'custom';

function resolveCrossubLeaseTermWeeks(choice: CrossubLeaseTermChoice, customWeeks: string): number {
  if (choice === '26') return 26;
  if (choice === '52') return 52;
  const weeks = Number(customWeeks);
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > 520) {
    throw new Error('Enter a valid lease term between 1 and 520 weeks');
  }
  return weeks;
}
export function PropertyWorkflowPanel({
  tab,
  property,
  propertyId,
  leasingCycles,
  rentReviews,
  vacatingCases,
  maintenance,
  inspections,
  tribunalCases,
  currentLease,
  tenantSelections,
  emptyTitle = 'No activity yet',
  emptyDescription,
  actionsOnly = false,
  onCreated,
}: {
  tab: PropertyWorkflowTab;
  property: Property;
  propertyId: string;
  leasingCycles: LeasingCycle[];
  rentReviews: RentReviewCase[];
  vacatingCases: VacatingCase[];
  maintenance: MaintenanceItem[];
  inspections: Inspection[];
  tribunalCases: TribunalCase[];
  currentLease?: LeasingRecord;
  tenantSelections?: TenantSelectionCase[];
  emptyTitle?: string;
  emptyDescription?: string;
  actionsOnly?: boolean;
  onCreated?: () => void;
}) {
  const { primaryAgency } = useAgentData();

  const ctx = useMemo(
    () =>
      buildPropertyWorkflowContext({
        propertyId,
        leasingCycles,
        rentReviews,
        vacatingCases,
        maintenance,
        inspections,
        tribunalCases,
        currentLease,
      }),
    [
      propertyId,
      leasingCycles,
      rentReviews,
      vacatingCases,
      maintenance,
      inspections,
      tribunalCases,
      currentLease,
    ],
  );

  const actions = tabActionsFor(tab, ctx);
  const [activeAction, setActiveAction] = useState<PropertyWorkflowActionId | null>(null);

  if (actions.length === 0) return null;

  const description =
    emptyDescription ??
    (tab === 'leasing'
      ? 'Start a new leasing cycle, rent review, or end leasing case for this property.'
      : tab === 'maintenance'
        ? 'Log a maintenance job for this property.'
        : tab === 'inspection'
          ? 'Schedule an ingoing inspection for this property.'
          : 'Open a tribunal case when escalated from maintenance or rent review.');

  return (
    <>
      {actionsOnly ? (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <WorkflowActionButton
              key={action.id}
              action={action}
              onClick={() => {
                if (action.disabled) return;
                if (action.id === 'open_tribunal') {
                  toast.info(
                    'New tribunal cases are opened from Maintenance or Rent Review triggers.',
                  );
                  return;
                }
                setActiveAction(action.id);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed bg-muted/20 p-4">
          <p className="text-center text-sm font-medium text-foreground">{emptyTitle}</p>
          <p className="text-muted-foreground mt-1 text-center text-xs leading-relaxed">
            {description}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {actions.map((action) => (
              <WorkflowActionButton
                key={action.id}
                action={action}
                onClick={() => {
                  if (action.disabled) return;
                  if (action.id === 'open_tribunal') {
                    toast.info(
                      'New tribunal cases are opened from Maintenance or Rent Review triggers.',
                    );
                    return;
                  }
                  setActiveAction(action.id);
                }}
              />
            ))}
          </div>
        </div>
      )}

      <PropertyWorkflowCreateDialog
        actionId={activeAction}
        open={activeAction != null && activeAction !== 'open_tribunal'}
        onOpenChange={(open) => {
          if (!open) setActiveAction(null);
        }}
        property={property}
        propertyId={propertyId}
        agency={primaryAgency}
        currentLease={currentLease}
        leasingCycle={ctx.leasingCycles[0]}
        tenantSelections={tenantSelections}
        onSuccess={() => {
          setActiveAction(null);
          onCreated?.();
        }}
      />
    </>
  );
}

function WorkflowActionButton({
  action,
  onClick,
}: {
  action: PropertyWorkflowAction;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={action.primary ? 'default' : 'outline'}
      className={cn(action.primary && 'bg-primary')}
      title={action.description}
      disabled={action.disabled}
      onClick={onClick}
    >
      <Plus className="size-3.5" />
      {action.label}
    </Button>
  );
}

export function PropertyWorkflowCreateDialog({
  actionId,
  open,
  onOpenChange,
  property,
  propertyId,
  agency,
  currentLease,
  leasingCycle,
  tenantSelections,
  onSuccess,
}: {
  actionId: PropertyWorkflowActionId | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property;
  propertyId: string;
  agency: ReturnType<typeof useAgentData>['primaryAgency'];
  currentLease?: LeasingRecord;
  leasingCycle?: LeasingCycle;
  tenantSelections?: TenantSelectionCase[];
  onSuccess: () => void;
}) {
  const router = useRouter();
  const { refresh, apiConnected } = useAgentData();
  const [submitting, setSubmitting] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(false);

  const [rentPerWeek, setRentPerWeek] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');
  const [tenantMovedOut, setTenantMovedOut] = useState<boolean | null>(null);
  const [tenantMovedOutDate, setTenantMovedOutDate] = useState('');
  const [lettingNotes, setLettingNotes] = useState('');

  const [tenantName, setTenantName] = useState('');
  const [leaseType, setLeaseType] = useState<'fixed' | 'periodic'>('fixed');
  const [fixedTermWeeks, setFixedTermWeeks] = useState<26 | 52>(52);
  const [initialLeaseStartDate, setInitialLeaseStartDate] = useState('');
  const [currentWeeklyRent, setCurrentWeeklyRent] = useState('');
  const [leaseTermAnchor, setLeaseTermAnchor] = useState<string | undefined>();
  const [preferredLeaseStartHint, setPreferredLeaseStartHint] = useState<string | null>(null);
  const [tenantNameHint, setTenantNameHint] = useState<string | null>(null);
  const [rentReviewPath, setRentReviewPath] = useState<RentReviewCreatePath>('crossub_managed');
  const [crossubLeaseTermChoice, setCrossubLeaseTermChoice] =
    useState<CrossubLeaseTermChoice>('52');
  const [crossubCustomTermWeeks, setCrossubCustomTermWeeks] = useState('');
  const [newRentValue, setNewRentValue] = useState('');
  const [newRentPeriod, setNewRentPeriod] = useState<RentPeriod>('weekly');
  const [rentNegotiationChoice, setRentNegotiationChoice] =
    useState<RentReviewNegotiationChoice | null>(null);
  const [rentPaidUntil, setRentPaidUntil] = useState('');

  const [terminationType, setTerminationType] = useState<'tenant_initiated' | 'termination'>(
    'tenant_initiated',
  );
  const [expectedVacateDate, setExpectedVacateDate] = useState('');
  const [terminationGround, setTerminationGround] = useState<TerminationNoticeGround>(
    TERMINATION_NOTICE_GROUND.LANDLORD_RESIDES,
  );
  const [proposedTerminationDate, setProposedTerminationDate] = useState('');
  const [breachClause, setBreachClause] = useState('');
  const [breachConduct, setBreachConduct] = useState('');
  const [bondHeld, setBondHeld] = useState('');
  const [bondHeldHint, setBondHeldHint] = useState<string | null>(null);
  const [terminationNotes, setTerminationNotes] = useState('');

  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [maintTenantName, setMaintTenantName] = useState('');
  const [maintTenantEmail, setMaintTenantEmail] = useState('');
  const [maintTenantPhone, setMaintTenantPhone] = useState('');

  const [moveInDate, setMoveInDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [inspTenantName, setInspTenantName] = useState('');
  const [inspTenantEmail, setInspTenantEmail] = useState('');
  const [inspTenantPhone, setInspTenantPhone] = useState('');
  const [accessInstructions, setAccessInstructions] = useState('');

  const rrPrefill = useMemo(
    () => buildRentReviewPrefill(property, agency, currentLease, { leasingCycle, tenantSelections }),
    [property, agency, currentLease, leasingCycle, tenantSelections],
  );
  const maintPrefill = useMemo(
    () => buildMaintenancePrefill(property, { currentLease, tenantSelections }),
    [property, currentLease, tenantSelections],
  );
  const inspPrefill = useMemo(
    () => buildIngoingInspectionPrefill(property, currentLease, leasingCycle, { tenantSelections }),
    [property, currentLease, leasingCycle, tenantSelections],
  );
  const minAvailableFrom = useMemo(() => minLeasingCycleAvailableFrom(), [open]);
  /** Avoid re-prefilling while the dialog is open (portfolio live-poll updates `property`). */
  const formPrefillSessionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      formPrefillSessionRef.current = null;
      return;
    }
    if (!actionId) return;

    const session = actionId;
    if (formPrefillSessionRef.current === session) return;
    formPrefillSessionRef.current = session;

    const leasingPrefill = buildLeasingCyclePrefill(property, currentLease);
    setRentPerWeek(leasingPrefill.rentPerWeek);
    setAvailableFrom(leasingPrefill.availableFrom);
    setTenantMovedOut(
      isPropertyVacant(property, currentLease ? [currentLease] : []) ? true : false,
    );
    setTenantMovedOutDate('');
    setLettingNotes('');

    const instantRentReview = buildRentReviewPrefill(property, agency, currentLease, {
      leasingCycle,
      tenantSelections,
    });
    setTenantName(instantRentReview.tenantName);
    setTenantNameHint(instantRentReview.tenantNameHint ?? null);
    setLeaseType(instantRentReview.leaseType);
    setFixedTermWeeks(instantRentReview.fixedTermWeeks);
    setInitialLeaseStartDate(instantRentReview.initialLeaseStartDate);
    setPreferredLeaseStartHint(instantRentReview.preferredLeaseStartHint ?? null);
    setLeaseTermAnchor(instantRentReview.leaseTermAnchor);
    setCurrentWeeklyRent(instantRentReview.currentWeeklyRent);
    setRentReviewPath('crossub_managed');
    setCrossubLeaseTermChoice('52');
    setCrossubCustomTermWeeks('');
    setNewRentValue('');
    setNewRentPeriod('weekly');
    setRentNegotiationChoice(null);
    setRentPaidUntil('');

    const instantTermination = buildTerminationPrefill(property, currentLease, { leasingCycle });
    setBondHeld(instantTermination.bondHeld);
    setBondHeldHint(instantTermination.bondHeldHint ?? null);

    setTerminationType('tenant_initiated');
    setExpectedVacateDate('');
    setTerminationGround(TERMINATION_NOTICE_GROUND.LANDLORD_RESIDES);
    setProposedTerminationDate('');
    setBreachClause('');
    setBreachConduct('');
    setTerminationNotes('');

    const maintenance = buildMaintenancePrefill(property, { currentLease, tenantSelections });
    setIssueType('');
    setDescription('');
    setUrgent(false);
    setMaintTenantName(maintenance.tenantName);
    setMaintTenantEmail(maintenance.tenantEmail);
    setMaintTenantPhone(maintenance.tenantPhone);

    const ingoing = buildIngoingInspectionPrefill(property, currentLease, leasingCycle, {
      tenantSelections,
    });
    setMoveInDate(ingoing.moveInDate);
    setScheduledTime(ingoing.scheduledTime ? ingoing.scheduledTime.slice(0, 16) : '');
    setInspTenantName(ingoing.tenantName);
    setInspTenantEmail(ingoing.tenantEmail);
    setInspTenantPhone(ingoing.tenantPhone);
    setAccessInstructions('');

    const needsAsyncPrefill =
      actionId === 'start_rent_review' ||
      actionId === 'start_end_leasing' ||
      actionId === 'start_maintenance' ||
      actionId === 'schedule_inspection';

    if (!needsAsyncPrefill) return;

    let active = true;
    setPrefillLoading(true);
    void (async () => {
      try {
        if (actionId === 'start_rent_review') {
          const rr = await fetchRentReviewPrefill(property, agency, currentLease, {
            leasingCycle,
            tenantSelections,
          });
          if (!active) return;
          setTenantName(rr.tenantName);
          setTenantNameHint(rr.tenantNameHint ?? null);
          setLeaseType(rr.leaseType);
          setFixedTermWeeks(rr.fixedTermWeeks);
          setInitialLeaseStartDate(rr.initialLeaseStartDate);
          setPreferredLeaseStartHint(rr.preferredLeaseStartHint ?? null);
          setLeaseTermAnchor(rr.leaseTermAnchor);
          setCurrentWeeklyRent(rr.currentWeeklyRent);
          setRentPaidUntil(rr.rentPaidUntil ?? '');
        } else if (actionId === 'start_end_leasing') {
          const term = await fetchTerminationPrefill(property, currentLease, { leasingCycle });
          if (!active) return;
          setBondHeld(term.bondHeld);
          setBondHeldHint(term.bondHeldHint ?? null);
        } else if (actionId === 'start_maintenance') {
          const maint = await fetchMaintenancePrefill(property, currentLease, {
            leasingCycle,
            tenantSelections,
          });
          if (!active) return;
          setMaintTenantName(maint.tenantName);
          setMaintTenantEmail(maint.tenantEmail);
          setMaintTenantPhone(maint.tenantPhone);
        } else if (actionId === 'schedule_inspection') {
          const ing = await fetchIngoingInspectionPrefill(
            property,
            currentLease,
            leasingCycle,
            tenantSelections,
          );
          if (!active) return;
          setMoveInDate(ing.moveInDate);
          setScheduledTime(ing.scheduledTime ? ing.scheduledTime.slice(0, 16) : '');
          setInspTenantName(ing.tenantName);
          setInspTenantEmail(ing.tenantEmail);
          setInspTenantPhone(ing.tenantPhone);
        }
      } finally {
        if (active) setPrefillLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [
    open,
    actionId,
    property,
    agency,
    currentLease,
    leasingCycle,
    tenantSelections,
  ]);

  const handleFixedTermWeeksChange = (weeks: 26 | 52) => {
    setFixedTermWeeks(weeks);
    if (!leaseTermAnchor) return;
    const next = recalcRentReviewLeaseStart(
      { leaseTermAnchor, initialLeaseStartDate },
      weeks,
    );
    setInitialLeaseStartDate(next.initialLeaseStartDate);
    setPreferredLeaseStartHint(next.hint);
  };

  const titles: Record<PropertyWorkflowActionId, string> = {
    start_leasing: 'Start new letting',
    start_rent_review: 'Add rent review',
    start_end_leasing: 'Add end leasing',
    start_maintenance: 'Log maintenance job',
    schedule_inspection: 'Schedule inspection',
    open_tribunal: 'Open tribunal case',
  };

  const handleSubmit = async () => {
    if (!actionId) return;
    setSubmitting(true);
    try {
      if (actionId === 'start_leasing') {
        const rent = Number(rentPerWeek);
        if (!rent || rent <= 0) throw new Error('Weekly rent is required');
        if (!availableFrom) throw new Error('Available from date is required');
        if (availableFrom < minAvailableFrom) {
          throw new Error(
            `Available from must be at least ${LEASING_CYCLE_AVAILABLE_FROM_MIN_DAYS} days from today`,
          );
        }
        if (tenantMovedOut === null) {
          throw new Error('Select whether the tenant has moved out');
        }
        if (tenantMovedOut && !tenantMovedOutDate) {
          throw new Error('Tenant moved out date is required');
        }
        const fixedTermWeeks = resolveCrossubLeaseTermWeeks(
          crossubLeaseTermChoice,
          crossubCustomTermWeeks,
        );
        const result = await createAgentLeasingCycle(propertyId, {
          rentPerWeek: rent,
          availableFrom: new Date(availableFrom).toISOString(),
          fixedTermWeeks,
          tenantMovedOut,
          tenantMovedOutDate: tenantMovedOut ? tenantMovedOutDate : undefined,
          notes: lettingNotes.trim() || undefined,
        });
        toast.success('Letting cycle created');
        if (apiConnected) {
          try {
            const view = await leasingOpsApi.get(result.id);
            const store = useLeasingWorkflowStore.getState();
            store.ensureDetail(propertyId, formatPropertyFullAddress(property), rent);
            store.applyCycleView(propertyId, view);
            store.resetActiveStepToHint(propertyId, LEASING_LIFECYCLE_STEP.OPEN_INSPECTION);
            store.setActiveStep(propertyId, LEASING_LIFECYCLE_STEP.OPEN_INSPECTION);
          } catch {
            /* live sync will catch up when the workflow opens */
          }
        }
      } else if (actionId === 'start_rent_review') {
        const rent = Number(currentWeeklyRent);
        if (!rent || rent <= 0) throw new Error('Current weekly rent is required');
        if (!initialLeaseStartDate) throw new Error('Preferred lease start date is required');

        const start = new Date(initialLeaseStartDate);
        const reviewDue = new Date(start);
        reviewDue.setFullYear(reviewDue.getFullYear() + 1);
        const reviewPayload = {
          currentWeeklyRent: rent,
          tenantName: tenantName.trim() || undefined,
          rentReviewDate: reviewDue.toISOString().slice(0, 10),
          initialLeaseStartDate,
        };

        if (rentReviewPath === 'crossub_managed') {
          const fixedTermWeeks = resolveCrossubLeaseTermWeeks(
            crossubLeaseTermChoice,
            crossubCustomTermWeeks,
          );
          const result = await createAgentRentReview(propertyId, {
            ...reviewPayload,
            leaseType: 'fixed',
            fixedTermWeeks,
          });
          toast.success('Rent review submitted to CROSSUB');
          await refresh();
          onSuccess();
          return;
        }

        if (!tenantName.trim()) throw new Error('Tenant name is required');
        const proposedRent = Number(newRentValue);
        if (!proposedRent || proposedRent <= 0) throw new Error('New rent value is required');
        if (!rentNegotiationChoice) {
          throw new Error('Select whether the new rent is negotiable');
        }

        const result = await createAgentRentReview(propertyId, {
          ...reviewPayload,
          tenantName: tenantName.trim(),
          leaseType,
          fixedTermWeeks: leaseType === 'fixed' ? fixedTermWeeks : undefined,
          proposedRent,
          rentPeriod: newRentPeriod,
          rentNegotiable: rentNegotiationChoice === 'negotiable',
          rentPaidUntil: rentPaidUntil || undefined,
        });
        toast.success('Rent review created');
        await refresh();
        onSuccess();
        router.push(rentReviewDetail(result.id, fromProperty(propertyId, 'Leasing')));
        return;
      } else if (actionId === 'start_end_leasing') {
        if (terminationType === 'tenant_initiated' && !expectedVacateDate) {
          throw new Error('Expected vacate date is required');
        }
        const result = await createAgentTerminationCase(propertyId, {
          terminationType,
          expectedVacateDate: expectedVacateDate || undefined,
          terminationGround:
            terminationType === 'termination' ? terminationGround : undefined,
          proposedTerminationDate: proposedTerminationDate || undefined,
          breachClause:
            terminationType === 'termination' &&
            terminationGround === TERMINATION_NOTICE_GROUND.BREACH
              ? breachClause.trim() || undefined
              : undefined,
          breachConduct:
            terminationType === 'termination' &&
            terminationGround === TERMINATION_NOTICE_GROUND.BREACH
              ? breachConduct.trim() || undefined
              : undefined,
          bondHeld: bondHeld ? Number(bondHeld) : undefined,
          terminationReason: terminationNotes.trim() || undefined,
        });
        toast.success('End leasing case created');
        await refresh();
        onSuccess();
        router.push(vacatingDetail(result.id, fromProperty(propertyId, 'Leasing')));
        return;
      } else if (actionId === 'start_maintenance') {
        if (!issueType.trim()) throw new Error('Issue type is required');
        if (description.trim().length < 5) throw new Error('Description is required');
        await createAgentMaintenanceRequest(propertyId, {
          issueType: issueType.trim(),
          description: description.trim(),
          address: maintPrefill.address,
          urgent,
          tenant: maintTenantName.trim()
            ? {
                name: maintTenantName.trim(),
                email: maintTenantEmail.trim() || undefined,
                phone: maintTenantPhone.trim() || undefined,
              }
            : undefined,
        });
        toast.success('Maintenance job logged');
      } else if (actionId === 'schedule_inspection') {
        if (!inspTenantName.trim()) throw new Error('Tenant name is required');
        if (!moveInDate) throw new Error('Move-in date is required');
        await inspectionsApi.createIngoing({
          propertyId,
          moveInDate,
          scheduledTime: scheduledTime
            ? new Date(scheduledTime).toISOString()
            : undefined,
          tenantName: inspTenantName.trim(),
          tenantEmail: inspTenantEmail.trim() || undefined,
          tenantPhone: inspTenantPhone.trim() || undefined,
          accessInstructions: accessInstructions.trim() || undefined,
        });
        toast.success('Ingoing inspection scheduled');
      }
      await refresh();
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create workflow');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{actionId ? titles[actionId] : 'Create'}</DialogTitle>
          <DialogDescription>{property.address}</DialogDescription>
        </DialogHeader>

        {actionId === 'start_leasing' ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tenant moved out? *</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={tenantMovedOut === true ? 'default' : 'outline'}
                  className={cn(
                    'h-9',
                    tenantMovedOut === true && 'bg-teal-600 text-white hover:bg-teal-700',
                  )}
                  onClick={() => setTenantMovedOut(true)}
                >
                  Yes
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={tenantMovedOut === false ? 'default' : 'outline'}
                  className={cn(
                    'h-9',
                    tenantMovedOut === false && 'bg-teal-600 text-white hover:bg-teal-700',
                  )}
                  onClick={() => setTenantMovedOut(false)}
                >
                  No
                </Button>
              </div>
              {tenantMovedOut === false ? (
                <p className="text-amber-700 dark:text-amber-400 text-[11px]">
                  Contact current tenant to schedule open inspection.
                </p>
              ) : null}
            </div>
            {tenantMovedOut === true ? (
              <Field label="Tenant moved out date *">
                <Input
                  type="date"
                  value={tenantMovedOutDate}
                  onChange={(e) => setTenantMovedOutDate(e.target.value)}
                />
              </Field>
            ) : null}
            <Field label="Lease term *">
              <div className="grid grid-cols-3 gap-2">
                {(['26', '52'] as const).map((weeks) => (
                  <Button
                    key={weeks}
                    type="button"
                    size="sm"
                    variant={crossubLeaseTermChoice === weeks ? 'default' : 'outline'}
                    className={cn(
                      crossubLeaseTermChoice === weeks &&
                        'bg-teal-600 text-white hover:bg-teal-700',
                    )}
                    onClick={() => setCrossubLeaseTermChoice(weeks)}
                  >
                    {weeks} weeks
                  </Button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant={crossubLeaseTermChoice === 'custom' ? 'default' : 'outline'}
                  className={cn(
                    crossubLeaseTermChoice === 'custom' &&
                      'bg-teal-600 text-white hover:bg-teal-700',
                  )}
                  onClick={() => setCrossubLeaseTermChoice('custom')}
                >
                  Custom
                </Button>
              </div>
              {crossubLeaseTermChoice === 'custom' ? (
                <Input
                  type="number"
                  min={1}
                  max={520}
                  className="mt-2"
                  placeholder="Enter number of weeks"
                  value={crossubCustomTermWeeks}
                  onChange={(e) => setCrossubCustomTermWeeks(e.target.value)}
                />
              ) : null}
            </Field>
            <Field label="Rent / week (AUD) *">
              <Input
                type="number"
                min={1}
                value={rentPerWeek}
                onChange={(e) => setRentPerWeek(e.target.value)}
              />
            </Field>
            <Field label="Available from *">
              <Input
                type="date"
                min={minAvailableFrom}
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
              />
              <p className="text-muted-foreground text-[11px]">
                Must be at least {LEASING_CYCLE_AVAILABLE_FROM_MIN_DAYS} days from today (earliest{' '}
                {minAvailableFrom}).
              </p>
            </Field>
            <Field label="Notes">
              <Textarea
                rows={3}
                placeholder="Access instructions, landlord requests, or other context for this letting…"
                value={lettingNotes}
                onChange={(e) => setLettingNotes(e.target.value)}
                maxLength={2000}
              />
            </Field>
          </div>
        ) : null}

        {actionId === 'start_rent_review' ? (
          <div className="space-y-3">
            <ReadOnlyField label="Property" value={rrPrefill.propertyAddress} />

            <div className="space-y-1.5">
              <Label className="text-xs">How is this review being handled?</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={rentReviewPath === 'crossub_managed' ? 'default' : 'outline'}
                  className={cn(
                    'h-auto min-h-9 whitespace-normal px-2 py-2 text-left text-xs leading-snug',
                    rentReviewPath === 'crossub_managed' && 'bg-teal-600 text-white hover:bg-teal-700',
                  )}
                  onClick={() => setRentReviewPath('crossub_managed')}
                >
                  Request CROSSUB review
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={rentReviewPath === 'landlord_agreed' ? 'default' : 'outline'}
                  className={cn(
                    'h-auto min-h-9 whitespace-normal px-2 py-2 text-left text-xs leading-snug',
                    rentReviewPath === 'landlord_agreed' && 'bg-teal-600 text-white hover:bg-teal-700',
                  )}
                  onClick={() => setRentReviewPath('landlord_agreed')}
                >
                  Landlord pre-agreed
                </Button>
              </div>
              <p className="text-muted-foreground text-[11px]">
                {rentReviewPath === 'crossub_managed'
                  ? 'CROSSUB runs the full rent review in the staff portal. You only need to specify the lease term.'
                  : 'Record terms you have already agreed with the landlord.'}
              </p>
            </div>

            {rentReviewPath === 'crossub_managed' ? (
              <Field label="Lease term *">
                <div className="grid grid-cols-3 gap-2">
                  {(['26', '52'] as const).map((weeks) => (
                    <Button
                      key={weeks}
                      type="button"
                      size="sm"
                      variant={crossubLeaseTermChoice === weeks ? 'default' : 'outline'}
                      className={cn(
                        crossubLeaseTermChoice === weeks &&
                          'bg-teal-600 text-white hover:bg-teal-700',
                      )}
                      onClick={() => setCrossubLeaseTermChoice(weeks)}
                    >
                      {weeks} weeks
                    </Button>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant={crossubLeaseTermChoice === 'custom' ? 'default' : 'outline'}
                    className={cn(
                      crossubLeaseTermChoice === 'custom' &&
                        'bg-teal-600 text-white hover:bg-teal-700',
                    )}
                    onClick={() => setCrossubLeaseTermChoice('custom')}
                  >
                    Custom
                  </Button>
                </div>
                {crossubLeaseTermChoice === 'custom' ? (
                  <Input
                    type="number"
                    min={1}
                    max={520}
                    className="mt-2"
                    placeholder="Enter number of weeks"
                    value={crossubCustomTermWeeks}
                    onChange={(e) => setCrossubCustomTermWeeks(e.target.value)}
                  />
                ) : null}
                {prefillLoading ? (
                  <p className="text-muted-foreground text-[11px]">
                    Loading tenancy details from the property record…
                  </p>
                ) : null}
              </Field>
            ) : (
              <>
                <Field label="Tenant name *">
                  <Input
                    value={tenantName}
                    onChange={(e) => {
                      setTenantName(e.target.value);
                      setTenantNameHint(null);
                    }}
                    disabled={prefillLoading}
                  />
                  {tenantNameHint && !prefillLoading ? (
                    <p className="text-muted-foreground text-[11px]">
                      Auto-filled · {tenantNameHint}
                    </p>
                  ) : null}
                </Field>
                <Field label="Lease type">
                  <select
                    className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                    value={leaseType}
                    onChange={(e) => setLeaseType(e.target.value as 'fixed' | 'periodic')}
                  >
                    <option value="fixed">Fixed term</option>
                    <option value="periodic">Periodic (no contract)</option>
                  </select>
                </Field>
                {leaseType === 'fixed' ? (
                  <Field label="Fixed term (weeks)">
                    <select
                      className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                      value={fixedTermWeeks}
                      onChange={(e) =>
                        handleFixedTermWeeksChange(Number(e.target.value) as 26 | 52)
                      }
                    >
                      <option value={26}>26 weeks</option>
                      <option value={52}>52 weeks</option>
                    </select>
                  </Field>
                ) : null}
                <Field label="Preferred lease start *">
                  <div className="relative">
                    <Input
                      type="date"
                      value={initialLeaseStartDate}
                      onChange={(e) => {
                        setInitialLeaseStartDate(e.target.value);
                        setPreferredLeaseStartHint(null);
                      }}
                      disabled={prefillLoading}
                    />
                    {prefillLoading ? (
                      <Loader2 className="text-muted-foreground absolute top-2.5 right-3 size-4 animate-spin" />
                    ) : null}
                  </div>
                  {preferredLeaseStartHint && !prefillLoading ? (
                    <p className="text-muted-foreground text-[11px]">
                      Auto-filled · {preferredLeaseStartHint}
                    </p>
                  ) : null}
                </Field>
                <Field label="Current weekly rent">
                  <Input
                    type="number"
                    readOnly
                    value={currentWeeklyRent}
                    className="bg-muted/50"
                    disabled={prefillLoading}
                  />
                  {currentWeeklyRent && !prefillLoading ? (
                    <p className="text-muted-foreground text-[11px]">
                      From active tenancy or leasing cycle.
                    </p>
                  ) : null}
                </Field>
                <Field label="New rent value *">
                  <Input
                    type="number"
                    min={1}
                    value={newRentValue}
                    onChange={(e) => setNewRentValue(e.target.value)}
                    placeholder="Enter agreed rent amount"
                  />
                </Field>
                <Field label="Period *">
                  <select
                    className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                    value={newRentPeriod}
                    onChange={(e) => setNewRentPeriod(e.target.value as RentPeriod)}
                  >
                    {RENT_PERIOD_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="space-y-1.5">
                  <Label className="text-xs">Rent negotiations *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={rentNegotiationChoice === 'negotiable' ? 'default' : 'outline'}
                      className={cn(
                        'h-auto min-h-9 whitespace-normal px-2 py-2 text-xs leading-snug',
                        rentNegotiationChoice === 'negotiable' &&
                          'bg-teal-600 text-white hover:bg-teal-700',
                      )}
                      onClick={() => setRentNegotiationChoice('negotiable')}
                    >
                      Negotiable
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={rentNegotiationChoice === 'not_negotiable' ? 'default' : 'outline'}
                      className={cn(
                        'h-auto min-h-9 whitespace-normal px-2 py-2 text-xs leading-snug',
                        rentNegotiationChoice === 'not_negotiable' &&
                          'bg-teal-600 text-white hover:bg-teal-700',
                      )}
                      onClick={() => setRentNegotiationChoice('not_negotiable')}
                    >
                      Not negotiable
                    </Button>
                  </div>
                  {rentNegotiationChoice === 'negotiable' ? (
                    <p className="text-amber-700 text-[11px] font-medium dark:text-amber-400">
                      Discuss the proposed rent with the tenant before it is finalised.
                    </p>
                  ) : null}
                </div>
                <ReadOnlyField
                  label="Rent paid until"
                  value={rentPaidUntil ? formatDate(rentPaidUntil) : '—'}
                />
                {prefillLoading && !rentPaidUntil ? (
                  <p className="text-muted-foreground text-[11px]">
                    Loading rent paid-to date from the ledger…
                  </p>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        {actionId === 'start_end_leasing' ? (
          <div className="space-y-3">
            <Field label="Case type">
              <select
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                value={terminationType}
                onChange={(e) =>
                  setTerminationType(e.target.value as 'tenant_initiated' | 'termination')
                }
              >
                <option value="tenant_initiated">Vacate (tenant initiated)</option>
                <option value="termination">Termination (landlord initiated)</option>
              </select>
            </Field>
            {terminationType === 'tenant_initiated' ? (
              <Field label="Expected vacate date *">
                <Input
                  type="date"
                  value={expectedVacateDate}
                  onChange={(e) => setExpectedVacateDate(e.target.value)}
                />
              </Field>
            ) : (
              <>
                <Field label="Termination ground *">
                  <select
                    className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                    value={terminationGround}
                    onChange={(e) => setTerminationGround(e.target.value as TerminationNoticeGround)}
                  >
                    {TERMINATION_NOTICE_GROUND_OPTIONS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Proposed termination date">
                  <Input
                    type="date"
                    value={proposedTerminationDate}
                    onChange={(e) => setProposedTerminationDate(e.target.value)}
                  />
                </Field>
                {terminationGround === TERMINATION_NOTICE_GROUND.BREACH ? (
                  <>
                    <Field label="Breach clause">
                      <Input
                        value={breachClause}
                        onChange={(e) => setBreachClause(e.target.value)}
                        placeholder="e.g. Clause 12 — rent arrears"
                      />
                    </Field>
                    <Field label="Breach conduct">
                      <Textarea
                        value={breachConduct}
                        onChange={(e) => setBreachConduct(e.target.value)}
                        rows={2}
                        placeholder="Describe the breach"
                      />
                    </Field>
                  </>
                ) : null}
              </>
            )}
            <Field label="Bond held">
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  value={bondHeld}
                  onChange={(e) => {
                    setBondHeld(e.target.value);
                    setBondHeldHint(null);
                  }}
                  disabled={prefillLoading}
                />
                {prefillLoading ? (
                  <Loader2 className="text-muted-foreground absolute top-2.5 right-3 size-4 animate-spin" />
                ) : null}
              </div>
              {bondHeldHint && !prefillLoading ? (
                <p className="text-muted-foreground text-[11px]">Auto-filled · {bondHeldHint}</p>
              ) : null}
            </Field>
            <Field label="Notes">
              <Textarea
                value={terminationNotes}
                onChange={(e) => setTerminationNotes(e.target.value)}
                rows={3}
              />
            </Field>
          </div>
        ) : null}

        {actionId === 'start_maintenance' ? (
          <div className="space-y-3">
            <ReadOnlyField label="Address" value={maintPrefill.address} />
            <Field label="Issue type *">
              <Input value={issueType} onChange={(e) => setIssueType(e.target.value)} />
            </Field>
            <Field label="Description *">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={urgent}
                onChange={(e) => setUrgent(e.target.checked)}
              />
              Urgent
            </label>
            <Field label="Tenant name">
              <Input value={maintTenantName} onChange={(e) => setMaintTenantName(e.target.value)} />
            </Field>
            <Field label="Tenant email">
              <Input
                type="email"
                value={maintTenantEmail}
                onChange={(e) => setMaintTenantEmail(e.target.value)}
              />
            </Field>
            <Field label="Tenant phone">
              <Input value={maintTenantPhone} onChange={(e) => setMaintTenantPhone(e.target.value)} />
            </Field>
          </div>
        ) : null}

        {actionId === 'schedule_inspection' ? (
          <div className="space-y-3">
            <ReadOnlyField label="Property" value={inspPrefill.address} />
            <ReadOnlyField label="Type" value={inspPrefill.propertyType} />
            <Field label="Tenant name *">
              <Input value={inspTenantName} onChange={(e) => setInspTenantName(e.target.value)} />
            </Field>
            <Field label="Tenant email">
              <Input
                type="email"
                value={inspTenantEmail}
                onChange={(e) => setInspTenantEmail(e.target.value)}
              />
            </Field>
            <Field label="Tenant phone">
              <Input value={inspTenantPhone} onChange={(e) => setInspTenantPhone(e.target.value)} />
            </Field>
            <Field label="Move-in date *">
              <Input type="date" value={moveInDate} onChange={(e) => setMoveInDate(e.target.value)} />
            </Field>
            <Field label="Scheduled inspection">
              <Input
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </Field>
            <Field label="Access instructions">
              <Textarea
                value={accessInstructions}
                onChange={(e) => setAccessInstructions(e.target.value)}
                rows={2}
              />
            </Field>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={submitting || (actionId === 'start_rent_review' && prefillLoading)}
            onClick={() => void handleSubmit()}
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : actionId === 'start_rent_review' && rentReviewPath === 'crossub_managed' ? (
              'Submit to CROSSUB'
            ) : (
              'Create'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
        {label}
      </p>
      <p className="bg-muted/40 rounded-md px-3 py-2 text-sm">{value}</p>
    </div>
  );
}
