'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  Building2,
  Loader2,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/components/providers/auth-provider';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { inspectionDetail, propertyDetail, propertyLeasingWorkflow, ROUTES } from '@/constants/routes';
import {
  createAgentIngoingInspection,
  createAgentLeasingCycle,
  createAgentOutgoingInspection,
  requestAgentOpenInspection,
  requestAgentRoutineInspection,
  scheduleAgentSelfOpenInspection,
} from '@/lib/crossub-api/agent-workflow-client';
import {
  INSPECTION_TIME_REQUEST_HINT,
  INSPECTION_TIME_REQUEST_NOTE_LABEL,
  INSPECTION_TIME_REQUEST_NOTE_PLACEHOLDER,
  INSPECTION_TIME_REQUEST_SUBMITTED,
  OPEN_PREFERRED_TIME_HINT,
  OPEN_REQUEST_SUBMITTED,
  VACATING_CASE_NOTE_PREFIX,
} from '@/constants/open-batch';
import { buildOpenPreferredWindow } from '@/lib/open-inspection/open-preferred-window';
import { inspectionsApi } from '@/lib/inspections-api';
import { mapInspectionRecordToView, mapOpenSessionToInspection } from '@/lib/inspection-mappers';
import {
  defaultOpenInspectionSchedule,
  suggestedOutgoingInspectionIsoFromDate,
  toDatetimeLocalValue,
} from '@/lib/inspections/outgoing-schedule';
import { openViewingsApi } from '@/lib/open-viewings-api';
import {
  buildAgentContactPrefill,
  buildIngoingInspectionPrefill,
  buildLeasingCyclePrefill,
  buildOutgoingInspectionPrefill,
  buildRoutineInspectionPrefill,
  fetchIngoingInspectionPrefill,
  type IngoingInspectionPrefill,
  LEASING_CYCLE_AVAILABLE_FROM_MIN_DAYS,
  minLeasingCycleAvailableFrom,
} from '@/lib/property-form-prefill';
import {
  LEASING_LIFECYCLE_STEP,
} from '@/lib/leasing/constants';
import { leasingOpsApi } from '@/lib/leasing-ops-api';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import { isPropertyVacant } from '@/lib/property-leasing';
import { routineInspectionApi, type RoutineScheduleByProperty } from '@/lib/routine-inspection-api';
import { routineScheduleNeedsNewInstance, isActiveRoutineInspectionStatus } from '@/lib/routine/routine-instance-state';
import { normalizeRoutinePoolInspectorName } from '@/lib/routine/routine-pool-inspector';
import { terminationApi } from '@/lib/termination-case-api';
import { inspectionReferenceLabel } from '@/lib/workflow-case-reference';
import { resolveOpenInspectionForCycle } from '@/lib/open-inspection-resolve';
import {
  getOpenListingContext,
  OPEN_CONDUCTED_BY_LABEL,
  SELF_OPEN_INSPECTION_DISCLAIMER,
  type OpenConductedBy,
} from '@/lib/open-inspection';
import type { Inspection, Property } from '@/lib/types';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';
import { cn, formatPropertyFullAddress } from '@/lib/utils';
import { finalizeBillingChargePayment } from '@/lib/billing/finalize-billing-payment';
import { prepareInspectionOrderPayment } from '@/lib/billing/inspection-order-payment';
import {
  StripePaymentDialog,
  type StripePaymentDialogState,
} from '@/components/billing/stripe-payment-dialog';

export type InspectionCreateType = 'OPEN' | 'INGOING' | 'OUTGOING' | 'ROUTINE';

export type InspectionCreateResult = {
  inspectionId?: string;
  inspection?: Inspection;
};

export const INSPECTION_CREATE_TYPE_OPTIONS: {
  id: InspectionCreateType;
  label: string;
  description: string;
  scheduleLabel: string;
}[] = [
  {
    id: 'OPEN',
    label: 'Open',
    scheduleLabel: 'Schedule open inspection',
    description: 'Prospect viewing for a vacant or new listing.',
  },
  {
    id: 'INGOING',
    label: 'Ingoing',
    scheduleLabel: 'Schedule ingoing inspection',
    description: 'Move-in condition report before a new tenant.',
  },
  {
    id: 'OUTGOING',
    label: 'Outgoing',
    scheduleLabel: 'Schedule outgoing inspection',
    description: 'End-of-lease condition report after vacating.',
  },
  {
    id: 'ROUTINE',
    label: 'Routine',
    scheduleLabel: 'Schedule routine inspection',
    description: 'Scheduled self or in-person routine check.',
  },
];

const TYPE_OPTIONS = INSPECTION_CREATE_TYPE_OPTIONS;

export function InspectionCreateTypeButtons({
  onSelect,
  className,
}: {
  onSelect: (type: InspectionCreateType) => void;
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-4', className)}>
      {INSPECTION_CREATE_TYPE_OPTIONS.map((option) => (
        <Button
          key={option.id}
          type="button"
          size="lg"
          variant={option.id === 'OPEN' ? 'default' : 'outline'}
          className="h-11 rounded-xl"
          onClick={() => onSelect(option.id)}
        >
          <Plus className="size-4" />
          {option.label}
        </Button>
      ))}
    </div>
  );
}

async function resolveCreatedOpenInspection(
  propertyId: string,
  openInspectionId?: string,
  cycleId?: string,
  viewingSessionId?: string | null,
): Promise<Inspection | null> {
  return resolveOpenInspectionForCycle({
    propertyId,
    cycleId,
    inspectionId: openInspectionId,
    viewingSessionId,
  });
}

type StandaloneOpenLeaseTermChoice = '26' | '52' | 'custom';

function resolveStandaloneOpenLeaseTermWeeks(
  choice: StandaloneOpenLeaseTermChoice,
  customWeeks: string,
): number {
  if (choice === '26') return 26;
  if (choice === '52') return 52;
  const weeks = Number(customWeeks);
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > 520) {
    throw new Error('Enter a valid lease term between 1 and 520 weeks');
  }
  return weeks;
}

export function CreateInspectionWizard({
  preselectedPropertyId: preselectedPropertyIdProp,
  initialType: initialTypeProp,
  hideTypePicker: hideTypePickerProp,
  hidePropertySelect: hidePropertySelectProp,
  leasingCycleId: leasingCycleIdProp,
  navigateOnSuccess = true,
  onCreated,
}: {
  preselectedPropertyId?: string | null;
  initialType?: InspectionCreateType | null;
  hideTypePicker?: boolean;
  hidePropertySelect?: boolean;
  /** When set (e.g. from new leasing step 1), CROSSUB requests link to this cycle. */
  leasingCycleId?: string;
  navigateOnSuccess?: boolean;
  onCreated?: (result: InspectionCreateResult) => void;
} = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPropertyId =
    preselectedPropertyIdProp ?? searchParams.get('property');
  const typeParam = (initialTypeProp ?? searchParams.get('type')) as InspectionCreateType | null;

  const {
    properties,
    leasingRecords,
    leasingCycles,
    vacating,
    tenantSelections,
    primaryAgency,
    apiConnected,
    refresh,
    addOpenInspection,
    registerInspection,
  } = useAgentData();
  const { user } = useAuth();

  const validPreselected =
    preselectedPropertyId && properties.some((p) => p.id === preselectedPropertyId)
      ? preselectedPropertyId
      : '';

  const initialType =
    typeParam && TYPE_OPTIONS.some((t) => t.id === typeParam) ? typeParam : null;

  const hideTypePicker = hideTypePickerProp ?? Boolean(initialType);
  const hidePropertySelect = hidePropertySelectProp ?? Boolean(validPreselected);

  const [inspectionType, setInspectionType] = useState<InspectionCreateType | null>(initialType);
  const [propertyId, setPropertyId] = useState(validPreselected);
  const [submitting, setSubmitting] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<StripePaymentDialogState | null>(null);
  const pendingPaidCreateRef = useRef<((platformChargeId?: string) => Promise<void>) | null>(
    null,
  );
  const [prefillLoading, setPrefillLoading] = useState(false);
  const prefillSessionRef = useRef<string | null>(null);
  const agentDataRef = useRef({
    properties,
    leasingRecords,
    leasingCycles,
    vacating,
    tenantSelections,
  });
  agentDataRef.current = {
    properties,
    leasingRecords,
    leasingCycles,
    vacating,
    tenantSelections,
  };

  useEffect(() => {
    if (validPreselected) {
      setPropertyId((current) => current || validPreselected);
    }
  }, [validPreselected]);

  useEffect(() => {
    if (leasingCycleIdProp) {
      setOpenConductedBy('crossub');
    }
  }, [leasingCycleIdProp]);

  useEffect(() => {
    return () => {
      prefillSessionRef.current = null;
    };
  }, []);

  const property = useMemo(
    () => properties.find((p) => p.id === propertyId),
    [properties, propertyId],
  );

  const currentLease = useMemo(
    () =>
      leasingRecords.find(
        (r) => r.propertyId === propertyId && (r.status === 'current' || r.status === 'upcoming'),
      ),
    [leasingRecords, propertyId],
  );

  const leasingCycle = useMemo(
    () => leasingCycles.find((c) => c.propertyId === propertyId),
    [leasingCycles, propertyId],
  );

  const propertyVacating = useMemo(
    () => vacating.filter((v) => v.propertyId === propertyId),
    [vacating, propertyId],
  );

  const propertyTenantSelections = useMemo(
    () => tenantSelections.filter((t) => t.propertyId === propertyId),
    [tenantSelections, propertyId],
  );

  const [openConductedBy, setOpenConductedBy] = useState<OpenConductedBy | null>(
    'crossub',
  );
  const [openScheduledLocal, setOpenScheduledLocal] = useState('');
  const [openPreferredStartLocal, setOpenPreferredStartLocal] = useState('');
  const [openPreferredEndLocal, setOpenPreferredEndLocal] = useState('');
  const [openPreferredNotes, setOpenPreferredNotes] = useState('');
  const [openAcknowledged, setOpenAcknowledged] = useState(false);
  const [openTenantNotified, setOpenTenantNotified] = useState(false);
  const [openTenantMovedOut, setOpenTenantMovedOut] = useState<boolean | null>(null);
  const [openPreferredRentPerWeek, setOpenPreferredRentPerWeek] = useState('');
  const [openPreferredAvailableFrom, setOpenPreferredAvailableFrom] = useState('');
  const [openLeaseTermChoice, setOpenLeaseTermChoice] =
    useState<StandaloneOpenLeaseTermChoice>('52');
  const [openCustomLeaseTermWeeks, setOpenCustomLeaseTermWeeks] = useState('');

  const [ingoing, setIngoing] = useState<IngoingInspectionPrefill>({
    address: '',
    propertyType: 'House',
    tenantName: '',
    tenantEmail: '',
    tenantPhone: '',
    moveInDate: '',
    scheduledTime: '',
    accessInstructions: '',
    leaseApprovalRef: '',
    priority: 'normal',
    notes: '',
  });
  const [ingoingScheduledLocal, setIngoingScheduledLocal] = useState('');

  const [routine, setRoutine] = useState({
    tenantName: '',
    tenantEmail: '',
    scheduledDate: '',
    frequency: 2 as 2 | 3,
    flow: 'in_person' as 'self' | 'in_person',
    inspectorName: '',
    /**
     * What the agent wants us to know when we pick the date (CRS-0068).
     *
     * This field is what `scheduledDate` became. The agent still has something to say
     * about timing — a tenant who works nights, a lease ending Friday — and losing that
     * along with the date picker would have made the change a removal rather than a
     * handover. It is read by a person and never parsed.
     */
    note: '',
  });
  const [existingRoutineSchedule, setExistingRoutineSchedule] =
    useState<RoutineScheduleByProperty | null>(null);

  const [vacatingCaseId, setVacatingCaseId] = useState('');
  const [outgoingInspector, setOutgoingInspector] = useState('Pending assignment');
  const [outgoingScheduledLocal, setOutgoingScheduledLocal] = useState('');

  const agentDisplayName = useMemo(() => {
    const parts = [user?.firstName, user?.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : undefined;
  }, [user?.firstName, user?.lastName]);

  const agentContact = useMemo(
    () => buildAgentContactPrefill(primaryAgency, agentDisplayName),
    [primaryAgency, agentDisplayName],
  );

  useEffect(() => {
    if (!propertyId || !inspectionType) {
      setPrefillLoading(false);
      return;
    }

    const session = `${propertyId}:${inspectionType}`;
    if (prefillSessionRef.current === session) {
      setPrefillLoading(false);
      return;
    }

    const {
      properties: latestProperties,
      leasingRecords: latestLeasingRecords,
      leasingCycles: latestLeasingCycles,
      vacating: latestVacating,
      tenantSelections: latestTenantSelections,
    } = agentDataRef.current;

    const propertyRow = latestProperties.find((p) => p.id === propertyId);
    if (!propertyRow) {
      setPrefillLoading(false);
      return;
    }

    let cancelled = false;
    setPrefillLoading(true);
    prefillSessionRef.current = session;

    const lease = latestLeasingRecords.find(
      (r) =>
        r.propertyId === propertyId && (r.status === 'current' || r.status === 'upcoming'),
    );
    const cycle = latestLeasingCycles.find((c) => c.propertyId === propertyId);
    const vacatingForProperty = latestVacating.filter((v) => v.propertyId === propertyId);
    const tenantSelectionsForProperty = latestTenantSelections.filter(
      (t) => t.propertyId === propertyId,
    );

    const applyPrefill = async () => {
      try {
        if (inspectionType === 'INGOING') {
          const prefill = apiConnected
            ? await fetchIngoingInspectionPrefill(
                propertyRow,
                lease,
                cycle,
                tenantSelectionsForProperty,
              )
            : buildIngoingInspectionPrefill(propertyRow, lease, cycle, {
                tenantSelections: tenantSelectionsForProperty,
              });
          if (cancelled) return;
          setIngoing(prefill);
          setIngoingScheduledLocal(toDatetimeLocalValue(prefill.scheduledTime));
        }

        if (inspectionType === 'ROUTINE') {
          const basePrefill = buildRoutineInspectionPrefill(propertyRow, {
            currentLease: lease,
            tenantSelections: tenantSelectionsForProperty,
          });
          if (apiConnected) {
            try {
              const { schedule } = await routineInspectionApi.getByProperty(propertyRow.id);
              if (cancelled) return;
              if (schedule) {
                setExistingRoutineSchedule(schedule);
                setRoutine({
                  ...basePrefill,
                  frequency: (schedule.frequency === 3 ? 3 : 2) as 2 | 3,
                  // Only the conduct mode carries over from an existing schedule now. The
                  // next date used to be prefilled here and shown in an editable field,
                  // which is how an agent came to be adjusting a cadence anchor CROSSUB
                  // owns — the field looked like theirs because it was filled in for them.
                  flow: schedule.flow,
                  note: '',
                });
                return;
              }
            } catch {
              // Fall through to the create form when lookup fails.
            }
          }
          setExistingRoutineSchedule(null);
          if (!cancelled) {
            setRoutine(basePrefill);
          }
        }

        if (inspectionType === 'OPEN') {
          if (!cancelled) {
            const leasingPrefill = buildLeasingCyclePrefill(propertyRow, lease);
            setOpenScheduledLocal(
              toDatetimeLocalValue(
                defaultOpenInspectionSchedule(propertyRow, cycle?.availableFrom),
              ),
            );
            setOpenPreferredRentPerWeek(leasingPrefill.rentPerWeek);
            setOpenPreferredAvailableFrom(leasingPrefill.availableFrom);
            setOpenLeaseTermChoice('52');
            setOpenCustomLeaseTermWeeks('');
            setOpenConductedBy('crossub');
            setOpenAcknowledged(false);
            setOpenTenantNotified(false);
            setOpenTenantMovedOut(
              isPropertyVacant(propertyRow, lease ? [lease] : []) ? true : null,
            );
          }
        }

        if (inspectionType === 'OUTGOING') {
          const activeCase = vacatingForProperty[0];
          if (!cancelled) {
            if (activeCase) {
              const prefill = buildOutgoingInspectionPrefill(activeCase);
              setVacatingCaseId(prefill.vacatingCaseId);
              setOutgoingInspector(prefill.inspector);
              setOutgoingScheduledLocal(toDatetimeLocalValue(prefill.scheduledAt));
            } else {
              setVacatingCaseId('');
              setOutgoingInspector('Pending assignment');
              setOutgoingScheduledLocal(
                toDatetimeLocalValue(suggestedOutgoingInspectionIsoFromDate(null)),
              );
            }
          }
        }
      } finally {
        if (!cancelled) setPrefillLoading(false);
      }
    };

    void applyPrefill();
    return () => {
      cancelled = true;
    };
  }, [propertyId, inspectionType, apiConnected]);

  const openListingContext = property ? getOpenListingContext(property) : null;
  const propertyIsVacant = property
    ? isPropertyVacant(property, currentLease ? [currentLease] : [])
    : false;
  const standaloneOpen = !leasingCycleIdProp;
  const manualStandaloneCrossubOpen =
    standaloneOpen && openConductedBy === 'crossub';
  const minOpenAvailableFrom = minLeasingCycleAvailableFrom();
  const isSelfOpen = openConductedBy === 'agent';

  const finalizeInspectionCreate = (inspection: Inspection) => {
    registerInspection(inspection);
    onCreated?.({ inspectionId: inspection.id, inspection });
    if (navigateOnSuccess) {
      router.push(inspectionDetail(inspection.id));
    }
    void refresh();
  };

  const finalizeAgentSelfOpenLeasing = async (cycleId: string, rentPerWeek: number) => {
    if (apiConnected) {
      try {
        const view = await leasingOpsApi.get(cycleId);
        const store = useLeasingWorkflowStore.getState();
        store.ensureDetail(property!.id, formatPropertyFullAddress(property!), rentPerWeek);
        store.applyCycleView(property!.id, view);
        store.setActiveStep(property!.id, LEASING_LIFECYCLE_STEP.APPLICATION_APPROVAL);
      } catch {
        /* live sync will catch up when the workflow opens */
      }
    }
    await refresh();
    onCreated?.({});
    if (navigateOnSuccess) {
      router.push(propertyLeasingWorkflow(property!.id));
    }
  };

  const withInspectionOrderPayment = async (
    serviceType: Parameters<typeof prepareInspectionOrderPayment>[0],
    orderPropertyId: string,
    run: (platformChargeId?: string) => Promise<void>,
  ) => {
    const prepared = await prepareInspectionOrderPayment(serviceType, orderPropertyId);
    if (prepared.status === 'needs_card') {
      pendingPaidCreateRef.current = run;
      setPaymentDialog(prepared.dialog);
      return;
    }
    await run(prepared.chargeId ?? undefined);
  };

  const handleInspectionPaymentSuccess = async () => {
    const run = pendingPaidCreateRef.current;
    const chargeId = paymentDialog?.chargeId;
    pendingPaidCreateRef.current = null;
    setPaymentDialog(null);
    setSubmitting(true);
    try {
      await finalizeBillingChargePayment(chargeId);
      await run?.(chargeId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create inspection');
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async () => {
    if (!property || !inspectionType) return;
    if (!apiConnected) {
      toast.error('Connect to the API to save inspections to CROSSUB.');
      return;
    }

    setSubmitting(true);
    try {
      if (inspectionType === 'OPEN') {
        if (!openConductedBy) throw new Error('Choose who conducts the open inspection');

        if (isSelfOpen) {
          if (standaloneOpen && !propertyIsVacant && openTenantMovedOut === null) {
            throw new Error('Select whether the tenant has moved out');
          }
          const rent = Number(openPreferredRentPerWeek);
          if (standaloneOpen) {
            if (!rent || rent <= 0) throw new Error('Preferred rent is required');
            if (!openPreferredAvailableFrom) throw new Error('Available from date is required');
            if (openPreferredAvailableFrom < minOpenAvailableFrom) {
              throw new Error(
                `Available from must be at least ${LEASING_CYCLE_AVAILABLE_FROM_MIN_DAYS} days from today`,
              );
            }
          }
          if (!openPreferredStartLocal) {
            throw new Error('Start date & time is required');
          }
          const start = new Date(openPreferredStartLocal);
          if (Number.isNaN(start.getTime())) {
            throw new Error('Start date & time is invalid');
          }
          const end = openPreferredEndLocal
            ? new Date(openPreferredEndLocal)
            : new Date(start.getTime() + 60 * 60 * 1000);
          if (Number.isNaN(end.getTime()) || end <= start) {
            throw new Error('End time must be after the start time');
          }

          let cycleId = leasingCycleIdProp ?? leasingCycle?.id ?? null;
          if (!cycleId) {
            const fixedTermWeeks = resolveStandaloneOpenLeaseTermWeeks(
              openLeaseTermChoice,
              openCustomLeaseTermWeeks,
            );
            const created = await createAgentLeasingCycle(property.id, {
              rentPerWeek: rent,
              availableFrom: new Date(openPreferredAvailableFrom).toISOString(),
              fixedTermWeeks,
              tenantMovedOut: propertyIsVacant ? true : Boolean(openTenantMovedOut),
              skipOpenInspection: true,
              agentConductsOpenInspection: true,
            });
            cycleId = created.id;
          }

          await scheduleAgentSelfOpenInspection(property.id, cycleId, {
            preferredStartTime: start.toISOString(),
            preferredEndTime: end.toISOString(),
            preferredNotes: openPreferredNotes.trim() || undefined,
          });
          toast.success('Self open inspection scheduled');
          await finalizeAgentSelfOpenLeasing(cycleId, rent || 0);
          return;
        }

        if (openConductedBy === 'crossub' && leasingCycleIdProp) {
          const cycleId = leasingCycleIdProp;
          if (!cycleId) {
            throw new Error(
              'Letting cycle is not ready — close and reopen the workflow, then try again',
            );
          }
          // The time is a preference now, not a booking, so an empty one is a complete
          // request rather than an error. Miara's flow: the agent flags the property, the
          // batch closes Wednesday noon, the inspector picks what they can cover and the
          // route decides the times. Requiring a time here is what let two properties
          // forty minutes apart be advertised for the same quarter hour.
          const preferred = buildOpenPreferredWindow(
            openPreferredStartLocal,
            openPreferredEndLocal,
          );
          await withInspectionOrderPayment(
            'open_inspection',
            property.id,
            async (platformChargeId) => {
              const result = await requestAgentOpenInspection(property.id, cycleId, {
                ...preferred,
                preferredNotes: openPreferredNotes.trim() || undefined,
                ...(platformChargeId ? { platformChargeId } : {}),
              });
              toast.success(OPEN_REQUEST_SUBMITTED);
              const inspection = await resolveCreatedOpenInspection(
                property.id,
                result.openInspectionId,
                cycleId,
              );
              if (inspection) {
                registerInspection(inspection);
                onCreated?.({ inspectionId: inspection.id, inspection });
              } else {
                onCreated?.({});
              }
              await refresh();
            },
          );
          return;
        }

        // No "a CROSSUB open needs a preferred time" guard here any more — that is the
        // request the agent is allowed to make, and CROSSUB answers it.
        // Tenant-moved-out only applies when the property currently has a tenant.
        if (manualStandaloneCrossubOpen && !propertyIsVacant && openTenantMovedOut === null) {
          throw new Error('Select whether the tenant has moved out');
        }
        if (manualStandaloneCrossubOpen) {
          const rent = Number(openPreferredRentPerWeek);
          if (!rent || rent <= 0) throw new Error('Preferred rent is required');
          if (!openPreferredAvailableFrom) throw new Error('Available from date is required');
          if (openPreferredAvailableFrom < minOpenAvailableFrom) {
            throw new Error(
              `Available from must be at least ${LEASING_CYCLE_AVAILABLE_FROM_MIN_DAYS} days from today`,
            );
          }
          resolveStandaloneOpenLeaseTermWeeks(openLeaseTermChoice, openCustomLeaseTermWeeks);
        }

        // Case 2: vacant / newly registered property — creating a CROSSUB open
        // must also create (or attach to) a New Leasing job case.
        if (manualStandaloneCrossubOpen && propertyIsVacant) {
          // The time is a preference now, not a booking, so an empty one is a complete
          // request rather than an error. Miara's flow: the agent flags the property, the
          // batch closes Wednesday noon, the inspector picks what they can cover and the
          // route decides the times. Requiring a time here is what let two properties
          // forty minutes apart be advertised for the same quarter hour.
          const preferred = buildOpenPreferredWindow(
            openPreferredStartLocal,
            openPreferredEndLocal,
          );
          const rent = Number(openPreferredRentPerWeek);
          const fixedTermWeeks = resolveStandaloneOpenLeaseTermWeeks(
            openLeaseTermChoice,
            openCustomLeaseTermWeeks,
          );
          await withInspectionOrderPayment(
            'open_inspection',
            property.id,
            async (platformChargeId) => {
              let cycleId = leasingCycle?.id;
              if (!cycleId) {
                const created = await createAgentLeasingCycle(property.id, {
                  rentPerWeek: rent,
                  availableFrom: new Date(openPreferredAvailableFrom).toISOString(),
                  fixedTermWeeks,
                  tenantMovedOut: true,
                  // Avoid a duplicate OPEN pool job — we request open explicitly below.
                  skipOpenInspection: true,
                });
                cycleId = created.id;
              }
              const result = await requestAgentOpenInspection(property.id, cycleId!, {
                ...preferred,
                preferredNotes: openPreferredNotes.trim() || undefined,
                ...(platformChargeId ? { platformChargeId } : {}),
              });
              toast.success(OPEN_REQUEST_SUBMITTED);
              const inspection = await resolveCreatedOpenInspection(
                property.id,
                result.openInspectionId,
                cycleId!,
              );
              if (inspection) {
                registerInspection(inspection);
                onCreated?.({ inspectionId: inspection.id, inspection });
              } else {
                onCreated?.({});
              }
              await refresh();
            },
          );
          return;
        }

        /**
         * The remaining path writes a viewing session directly, which means it needs a
         * real start — so a CROSSUB open with no preferred time must not reach it. It
         * would produce `Invalid Date` and advertise a viewing window built from `NaN`.
         *
         * A CROSSUB open belongs in the weekly batch, and every route into that batch is
         * handled above. Reaching here means the letting cycle is missing, which is a
         * state to report rather than to paper over with an invented time.
         */
        if (openConductedBy === 'crossub' && !openPreferredStartLocal) {
          throw new Error(
            'This property is not on a letting yet — open the leasing workflow and request the open inspection from there',
          );
        }
        // An agent-conducted open is the agent's own diary and stays theirs to set: they
        // are the one attending it. CRS-0068 is about the inspections CROSSUB runs.
        const scheduledAt = openConductedBy === 'crossub'
          ? new Date(openPreferredStartLocal).toISOString()
          : new Date(openScheduledLocal).toISOString();
        const start = scheduledAt;
        const end = openConductedBy === 'crossub' && openPreferredEndLocal
          ? new Date(openPreferredEndLocal).toISOString()
          : new Date(new Date(start).getTime() + 60 * 60_000).toISOString();
        const standaloneLeaseTermWeeks = manualStandaloneCrossubOpen
          ? resolveStandaloneOpenLeaseTermWeeks(openLeaseTermChoice, openCustomLeaseTermWeeks)
          : null;
        const createStandaloneViewing = async () => {
          const session = await openViewingsApi.create({
            propertyId: property.id,
            startTime: start,
            endTime: end,
            shortNote: openConductedBy === 'crossub' ? openPreferredNotes : undefined,
            agentName: agentContact.agentName || undefined,
            agentPhone: agentContact.agentPhone || undefined,
            agentRole: 'leasing_agent',
            ...(manualStandaloneCrossubOpen && openTenantMovedOut != null
              ? {
                  tenantMovedOut: openTenantMovedOut,
                  preferredRentPerWeek: Number(openPreferredRentPerWeek),
                  preferredLeaseTerm: `${standaloneLeaseTermWeeks} weeks`,
                  preferredAvailableFrom: new Date(openPreferredAvailableFrom).toISOString(),
                }
              : {}),
          });
          const view = mapOpenSessionToInspection(session, property.id);
          toast.success(
            openConductedBy === 'crossub'
              ? 'Open inspection requested'
              : 'Self open inspection scheduled',
          );
          finalizeInspectionCreate(view);
        };
        if (openConductedBy === 'crossub') {
          await withInspectionOrderPayment(
            'open_inspection',
            property.id,
            createStandaloneViewing,
          );
          return;
        }
        await createStandaloneViewing();
        return;
      }

      if (inspectionType === 'INGOING') {
        if (!ingoing.tenantName.trim()) throw new Error('Tenant name is required');
        // The move-in date stays required and stays the agent's — it is a fact about the
        // tenancy they arranged, not a slot in CROSSUB's diary. Only the inspection time
        // moved to us (CRS-0068).
        if (!ingoing.moveInDate) throw new Error('Move-in date is required');
        await withInspectionOrderPayment(
          'ingoing_inspection',
          property.id,
          async (platformChargeId) => {
            const created = await createAgentIngoingInspection(property.id, {
              moveInDate: ingoing.moveInDate,
              tenantName: ingoing.tenantName.trim(),
              tenantEmail: ingoing.tenantEmail.trim() || undefined,
              tenantPhone: ingoing.tenantPhone.trim() || undefined,
              priority: ingoing.priority,
              accessInstructions: ingoing.accessInstructions.trim() || undefined,
              notes: ingoing.notes?.trim() || undefined,
              ...(platformChargeId ? { platformChargeId } : {}),
            });
            let view: Inspection;
            try {
              const record = await inspectionsApi.get(created.id);
              view = mapInspectionRecordToView(record);
            } catch {
              view = {
                id: created.id,
                trackingNumber: workflowCaseReferenceLabel(created.id, 'ingoing'),
                type: 'INGOING',
                propertyId: property.id,
                propertyAddress: property.address,
                // No time, and the fallback view must not invent one — an optimistic card
                // showing "now" is the same fabrication as the server writing `createdAt`
                // into the scheduled column.
                status: 'Scheduled',
                reportStatus: 'pending',
                createdAt: new Date().toISOString(),
                timeline: [],
                source: 'inspection',
              };
            }
            toast.success(INSPECTION_TIME_REQUEST_SUBMITTED);
            finalizeInspectionCreate(view);
          },
        );
        return;
      }

      if (inspectionType === 'ROUTINE') {
        /**
         * Routine is now one call, and the code this replaced is the reason.
         *
         * The wizard used to drive the **staff** routine console straight from the agent
         * app — `override` to write `nextInspectionDate`, then `start` or `restart` to
         * spawn an instance on a date the agent typed. Those are `/inspections/routine`
         * routes gated on `MODIFY_CUSTOMER_INFO`, which an outside agency's login holds,
         * because one role key (`ACCOUNT_MANAGER`) serves both CROSSUB's internal account
         * manager and the agency. So it was never blocked; it worked, and an agent was
         * setting the cadence anchor for a schedule they do not operate — and `start`
         * emails the tenant, so a date they picked went straight out under our name.
         *
         * What an agent legitimately decides is that the property should be on routine and
         * whether the tenant self-conducts. The cadence comes from the property's state
         * (NSW 3/yr, VIC 2/yr) and each instance date from the account manager.
         */
        if (routine.flow === 'in_person') {
          const needsNewInPersonCase =
            !existingRoutineSchedule ||
            routineScheduleNeedsNewInstance(
              existingRoutineSchedule.currentInspectionStatus,
            );
          const submitRoutine = async (platformChargeId?: string) => {
            const created = await requestAgentRoutineInspection(property.id, {
              flow: routine.flow,
              note: routine.note?.trim() || undefined,
              ...(platformChargeId ? { platformChargeId } : {}),
            });
            toast.success(INSPECTION_TIME_REQUEST_SUBMITTED);
            try {
              const record = await inspectionsApi.get(created.id);
              finalizeInspectionCreate(mapInspectionRecordToView(record));
            } catch {
              void refresh();
              if (navigateOnSuccess) router.push(`${ROUTES.INSPECTIONS}?type=ROUTINE`);
            }
          };
          if (needsNewInPersonCase) {
            await withInspectionOrderPayment(
              'routine_inspection',
              property.id,
              submitRoutine,
            );
            return;
          }
          await submitRoutine();
          return;
        }
        await requestAgentRoutineInspection(property.id, {
          flow: routine.flow,
          note: routine.note?.trim() || undefined,
        });
        toast.success(INSPECTION_TIME_REQUEST_SUBMITTED);
        void refresh();
        if (navigateOnSuccess) router.push(`${ROUTES.INSPECTIONS}?type=ROUTINE`);
        return;
      }

      if (inspectionType === 'OUTGOING') {
        /**
         * No time, and no inspector — both are CROSSUB's to decide (CRS-0068).
         *
         * The inspector matters as much as the date here. An agent naming one decided who
         * would drive before anyone knew when the job would run, which is the same mistake
         * in a second field, and it is why the outgoing form's Inspector box is gone too.
         */
        await withInspectionOrderPayment(
          'outgoing_inspection',
          property.id,
          async (platformChargeId) => {
            /**
             * One path now, and the vacating case rides along as a note.
             *
             * The wizard used to fork here: with a vacating case it called
             * `terminationApi.scheduleInspection` — a staff end-leasing route — with the
             * agent's date. That fork is what made "who chose this time" have two different
             * answers depending on which screen the agent came from. Both are requests now;
             * the officer working the end-leasing case still schedules it, and the case
             * reference travels with the request so they can find it.
             */
            const created = await createAgentOutgoingInspection(property.id, {
              notes: vacatingCaseId
                ? `${VACATING_CASE_NOTE_PREFIX} ${workflowCaseReferenceLabel(vacatingCaseId, 'end_leasing')}`
                : undefined,
              tenantName: property.tenantName?.trim() || undefined,
              tenantEmail: property.tenantContact?.email?.trim() || undefined,
              tenantPhone: property.tenantContact?.phone?.trim() || undefined,
              ...(platformChargeId ? { platformChargeId } : {}),
            });
            const inspectionId = created.id;

            let view: Inspection | null = null;
            try {
              const record = await inspectionsApi.get(inspectionId);
              view = mapInspectionRecordToView(record);
            } catch {
              view = {
                id: inspectionId,
                trackingNumber: inspectionReferenceLabel(inspectionId, 'OUTGOING'),
                type: 'OUTGOING',
                propertyId: property.id,
                propertyAddress: property.address,
                // No `scheduledAt` — see the ingoing fallback above.
                status: 'Scheduled',
                reportStatus: 'pending',
                createdAt: new Date().toISOString(),
                timeline: [],
                source: 'inspection',
              };
            }
            toast.success(INSPECTION_TIME_REQUEST_SUBMITTED);
            if (view) {
              finalizeInspectionCreate(view);
            } else {
              void refresh();
              if (navigateOnSuccess) router.push(`${ROUTES.INSPECTIONS}?type=OUTGOING`);
            }
          },
        );
        return;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create inspection');
    } finally {
      setSubmitting(false);
    }
  };

  const showForm = Boolean(property && inspectionType);

  return (
    <div className="space-y-5">
      {!apiConnected ? (
        <div className="flex gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <p>
            Inspections are only saved to CROSSUB when you are connected to the API. Offline entries
            are not written to the database.
          </p>
        </div>
      ) : null}

      <section className="space-y-3">
        {!hideTypePicker ? (
          <>
            <div>
              <h2 className="text-sm font-semibold">Inspection type</h2>
              <p className="text-muted-foreground mt-1 text-xs">
                Select a type — the form below autofills from the property portfolio, same as property
                workflow cases.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setInspectionType(option.id)}
                  className={cn(
                    'rounded-xl border bg-card p-3 text-left transition hover:bg-secondary/30',
                    inspectionType === option.id && 'border-primary ring-1 ring-primary/20',
                  )}
                >
                  <p className="text-sm font-semibold">{option.label}</p>
                  <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
                    {option.description}
                  </p>
                </button>
              ))}
            </div>
          </>
        ) : null}
      </section>

      {!hidePropertySelect ? (
        <section className="space-y-2">
          <Label htmlFor="inspection-property">Property *</Label>
          <select
            id="inspection-property"
            className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
          >
            <option value="">Select a property…</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.address}, {p.suburb}
                {p.tenantName ? ` · ${p.tenantName}` : ''}
              </option>
            ))}
          </select>
        </section>
      ) : property ? (
        <section className="rounded-xl border bg-secondary/20 px-3 py-2 text-xs">
          <p className="text-muted-foreground font-medium uppercase tracking-wide">Property</p>
          <p className="mt-0.5 font-medium">
            {property.address}, {property.suburb}
          </p>
        </section>
      ) : null}

      {showForm ? (
        <section className="relative space-y-4 rounded-xl border bg-card p-4">
          {prefillLoading ? (
            <div
              className="bg-card/80 absolute inset-0 z-10 flex items-center justify-center rounded-xl backdrop-blur-[1px]"
              aria-busy="true"
              aria-live="polite"
            >
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" />
                Prefilling form…
              </div>
            </div>
          ) : null}
          <>
              {inspectionType === 'OPEN' && property ? (
                <OpenInspectionForm
                  property={property}
                  listingContext={openListingContext}
                  leasingRequestMode={Boolean(leasingCycleIdProp)}
                  conductedBy={openConductedBy}
                  onConductedByChange={setOpenConductedBy}
                  scheduledLocal={openScheduledLocal}
                  onScheduledLocalChange={setOpenScheduledLocal}
                  preferredStartLocal={openPreferredStartLocal}
                  onPreferredStartLocalChange={setOpenPreferredStartLocal}
                  preferredEndLocal={openPreferredEndLocal}
                  onPreferredEndLocalChange={setOpenPreferredEndLocal}
                  preferredNotes={openPreferredNotes}
                  onPreferredNotesChange={setOpenPreferredNotes}
                  acknowledged={openAcknowledged}
                  onAcknowledgedChange={setOpenAcknowledged}
                  tenantNotified={openTenantNotified}
                  onTenantNotifiedChange={setOpenTenantNotified}
                  showTenantMovedOut={standaloneOpen && !propertyIsVacant}
                  showListingFields={standaloneOpen}
                  tenantMovedOut={openTenantMovedOut}
                  onTenantMovedOutChange={setOpenTenantMovedOut}
                  preferredRentPerWeek={openPreferredRentPerWeek}
                  onPreferredRentPerWeekChange={setOpenPreferredRentPerWeek}
                  preferredAvailableFrom={openPreferredAvailableFrom}
                  onPreferredAvailableFromChange={setOpenPreferredAvailableFrom}
                  minAvailableFrom={minOpenAvailableFrom}
                  leaseTermChoice={openLeaseTermChoice}
                  onLeaseTermChoiceChange={setOpenLeaseTermChoice}
                  customLeaseTermWeeks={openCustomLeaseTermWeeks}
                  onCustomLeaseTermWeeksChange={setOpenCustomLeaseTermWeeks}
                />
              ) : null}

              {inspectionType === 'INGOING' ? (
                <IngoingInspectionForm
                  ingoing={ingoing}
                  onChange={setIngoing}
                  scheduledLocal={ingoingScheduledLocal}
                  onScheduledLocalChange={setIngoingScheduledLocal}
                />
              ) : null}

              {inspectionType === 'ROUTINE' ? (
                <>
                  {existingRoutineSchedule ? (
                    <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-sm">
                      {routineScheduleNeedsNewInstance(
                        existingRoutineSchedule.currentInspectionStatus,
                      ) ? (
                        <>
                          <p className="font-medium">Schedule next routine inspection</p>
                          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                            The previous routine cycle is complete. Confirm the next inspection
                            date and cadence below — a new routine case will be created (
                            {existingRoutineSchedule.frequency}× per year, every{' '}
                            {existingRoutineSchedule.frequencyMonths} months
                            {existingRoutineSchedule.nextInspectionDate
                              ? ` · next due ${existingRoutineSchedule.nextInspectionDate.slice(0, 10)}`
                              : ''}
                            ).
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-medium">Routine inspection in progress</p>
                          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                            This property already has an active routine case. Saving will update
                            the schedule settings only — open the current case from Inspections
                            to continue work.
                          </p>
                        </>
                      )}
                    </div>
                  ) : null}
                  <RoutineInspectionForm
                    routine={routine}
                    onChange={setRoutine}
                    isExistingSchedule={Boolean(existingRoutineSchedule)}
                  />
                </>
              ) : null}

              {inspectionType === 'OUTGOING' && property ? (
                <OutgoingInspectionForm
                  vacatingCases={propertyVacating}
                  vacatingCaseId={vacatingCaseId}
                  onVacatingCaseIdChange={setVacatingCaseId}
                  inspector={outgoingInspector}
                  onInspectorChange={setOutgoingInspector}
                  scheduledLocal={outgoingScheduledLocal}
                  onScheduledLocalChange={setOutgoingScheduledLocal}
                  propertyId={property.id}
                />
              ) : null}

              <Button
                className="h-11 w-full rounded-xl"
                disabled={
                  submitting ||
                  prefillLoading ||
                  !apiConnected
                }
                onClick={() => void submit()}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {inspectionType === 'ROUTINE' && existingRoutineSchedule
                      ? routineScheduleNeedsNewInstance(
                          existingRoutineSchedule.currentInspectionStatus,
                        )
                        ? 'Scheduling…'
                        : 'Updating…'
                      : 'Creating…'}
                  </>
                ) : inspectionType === 'OPEN' ? (
                  'Create'
                ) : inspectionType === 'ROUTINE' && existingRoutineSchedule ? (
                  routineScheduleNeedsNewInstance(
                    existingRoutineSchedule.currentInspectionStatus,
                  )
                    ? 'Schedule next routine inspection'
                    : 'Update routine schedule'
                ) : (
                  'Create inspection'
                )}
              </Button>
          </>
        </section>
      ) : (
        <p className="text-muted-foreground text-center text-sm">
          Choose an inspection type and property to see the prefilled form.
        </p>
      )}
      <StripePaymentDialog
        state={paymentDialog}
        onOpenChange={(open) => {
          if (!open) {
            pendingPaidCreateRef.current = null;
            setPaymentDialog(null);
          }
        }}
        onSuccess={() => void handleInspectionPaymentSuccess()}
      />
    </div>
  );
}

function OpenInspectionForm({
  property,
  listingContext,
  leasingRequestMode = false,
  conductedBy,
  onConductedByChange,
  scheduledLocal,
  onScheduledLocalChange,
  preferredStartLocal,
  onPreferredStartLocalChange,
  preferredEndLocal,
  onPreferredEndLocalChange,
  preferredNotes,
  onPreferredNotesChange,
  acknowledged,
  onAcknowledgedChange,
  tenantNotified,
  onTenantNotifiedChange,
  showTenantMovedOut = false,
  showListingFields = false,
  tenantMovedOut,
  onTenantMovedOutChange,
  preferredRentPerWeek,
  onPreferredRentPerWeekChange,
  preferredAvailableFrom,
  onPreferredAvailableFromChange,
  minAvailableFrom,
  leaseTermChoice,
  onLeaseTermChoiceChange,
  customLeaseTermWeeks,
  onCustomLeaseTermWeeksChange,
}: {
  property: Property;
  listingContext: ReturnType<typeof getOpenListingContext> | null;
  leasingRequestMode?: boolean;
  conductedBy: OpenConductedBy | null;
  onConductedByChange: (v: OpenConductedBy) => void;
  scheduledLocal: string;
  onScheduledLocalChange: (v: string) => void;
  preferredStartLocal: string;
  onPreferredStartLocalChange: (v: string) => void;
  preferredEndLocal: string;
  onPreferredEndLocalChange: (v: string) => void;
  preferredNotes: string;
  onPreferredNotesChange: (v: string) => void;
  acknowledged: boolean;
  onAcknowledgedChange: (v: boolean) => void;
  tenantNotified: boolean;
  onTenantNotifiedChange: (v: boolean) => void;
  showTenantMovedOut?: boolean;
  /** Standalone open from Properties — rent / term / available-from. */
  showListingFields?: boolean;
  tenantMovedOut: boolean | null;
  onTenantMovedOutChange: (v: boolean) => void;
  preferredRentPerWeek: string;
  onPreferredRentPerWeekChange: (v: string) => void;
  preferredAvailableFrom: string;
  onPreferredAvailableFromChange: (v: string) => void;
  minAvailableFrom: string;
  leaseTermChoice: StandaloneOpenLeaseTermChoice;
  onLeaseTermChoiceChange: (v: StandaloneOpenLeaseTermChoice) => void;
  customLeaseTermWeeks: string;
  onCustomLeaseTermWeeksChange: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      {!leasingRequestMode ? (
        <div className="space-y-2">
          <Label>Who conducts the open inspection?</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {(['crossub', 'agent'] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => onConductedByChange(id)}
                className={cn(
                  'rounded-xl border p-3 text-left text-xs',
                  conductedBy === id ? 'border-primary bg-primary/5' : 'hover:bg-secondary/40',
                )}
              >
                <p className="text-sm font-semibold">{OPEN_CONDUCTED_BY_LABEL[id]}</p>
              </button>
            ))}
          </div>
          {conductedBy === 'crossub' ? (
            <p className="text-muted-foreground text-[11px]">
              The $55 inc GST open-inspection fee is charged when you place this order.
            </p>
          ) : conductedBy === 'agent' ? (
            <p className="text-amber-700 dark:text-amber-400 text-[11px]">
              {SELF_OPEN_INSPECTION_DISCLAIMER}
            </p>
          ) : null}
        </div>
      ) : null}

      {conductedBy ? (
        <>
          {showTenantMovedOut ? (
            <div className="space-y-2">
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
                  onClick={() => onTenantMovedOutChange(true)}
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
                  onClick={() => onTenantMovedOutChange(false)}
                >
                  No
                </Button>
              </div>
              {tenantMovedOut === false ? (
                <p className="text-amber-700 dark:text-amber-400 text-[11px]">
                  {conductedBy === 'crossub'
                    ? "The current tenant's details will appear on the job case for CROSSUB to contact them."
                    : 'You must notify the current tenant of the open inspection date and time yourself.'}
                </p>
              ) : null}
            </div>
          ) : null}
          {showListingFields ? (
            <>
              <Field label="Preferred rent / week (AUD) *">
                <Input
                  type="number"
                  min={1}
                  value={preferredRentPerWeek}
                  onChange={(e) => onPreferredRentPerWeekChange(e.target.value)}
                />
              </Field>
              <Field label="Preferred lease term *">
                <div className="grid grid-cols-3 gap-2">
                  {(['26', '52'] as const).map((weeks) => (
                    <Button
                      key={weeks}
                      type="button"
                      size="sm"
                      variant={leaseTermChoice === weeks ? 'default' : 'outline'}
                      className={cn(
                        'h-9',
                        leaseTermChoice === weeks && 'bg-teal-600 text-white hover:bg-teal-700',
                      )}
                      onClick={() => onLeaseTermChoiceChange(weeks)}
                    >
                      {weeks} weeks
                    </Button>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant={leaseTermChoice === 'custom' ? 'default' : 'outline'}
                    className={cn(
                      'h-9',
                      leaseTermChoice === 'custom' && 'bg-teal-600 text-white hover:bg-teal-700',
                    )}
                    onClick={() => onLeaseTermChoiceChange('custom')}
                  >
                    Custom
                  </Button>
                </div>
                {leaseTermChoice === 'custom' ? (
                  <Input
                    type="number"
                    min={1}
                    max={520}
                    className="mt-2"
                    placeholder="Enter number of weeks"
                    value={customLeaseTermWeeks}
                    onChange={(e) => onCustomLeaseTermWeeksChange(e.target.value)}
                  />
                ) : null}
              </Field>
              <Field label="Available from *">
                <Input
                  type="date"
                  min={minAvailableFrom}
                  value={preferredAvailableFrom}
                  onChange={(e) => onPreferredAvailableFromChange(e.target.value)}
                />
                <p className="text-muted-foreground text-[11px]">
                  Must be at least {LEASING_CYCLE_AVAILABLE_FROM_MIN_DAYS} days from today (earliest{' '}
                  {minAvailableFrom}).
                </p>
              </Field>
            </>
          ) : null}
          <Field
            label={
              conductedBy === 'crossub'
                ? 'Preferred start date & time (optional)'
                : 'Start date & time *'
            }
          >
            <Input
              type="datetime-local"
              value={preferredStartLocal}
              onChange={(e) => onPreferredStartLocalChange(e.target.value)}
            />
            {conductedBy === 'crossub' ? (
              <p className="text-muted-foreground mt-1 text-[11px]">
                {OPEN_PREFERRED_TIME_HINT}
              </p>
            ) : (
              <p className="text-muted-foreground mt-1 text-[11px]">
                You set the viewing time. Any day of the week — Saturday is only required when
                CROSSUB conducts.
              </p>
            )}
          </Field>
          <Field
            label={
              conductedBy === 'crossub'
                ? 'Preferred end date & time (optional)'
                : 'End date & time (optional)'
            }
          >
            <Input
              type="datetime-local"
              value={preferredEndLocal}
              onChange={(e) => onPreferredEndLocalChange(e.target.value)}
            />
            {conductedBy === 'agent' ? (
              <p className="text-muted-foreground mt-1 text-[11px]">
                Defaults to one hour after the start if left blank.
              </p>
            ) : null}
          </Field>
          <Field label="Notes (optional)">
            <Textarea
              value={preferredNotes}
              onChange={(e) => onPreferredNotesChange(e.target.value)}
              rows={3}
              placeholder="e.g. Tenant needs 24h notice…"
            />
          </Field>
          <p className="text-muted-foreground text-xs">
            {conductedBy === 'crossub'
              ? leasingRequestMode
                ? 'Choose a Saturday — CROSSUB assigns an inspector from the task pool.'
                : 'CROSSUB open inspections are scheduled on Saturdays only.'
              : 'You run this open yourself. Pick a time that suits you — it does not need to be a Saturday.'}
          </p>
        </>
      ) : null}
    </div>
  );
}

function IngoingInspectionForm({
  ingoing,
  onChange,
  scheduledLocal,
  onScheduledLocalChange,
}: {
  ingoing: IngoingInspectionPrefill;
  onChange: (v: IngoingInspectionPrefill) => void;
  scheduledLocal: string;
  onScheduledLocalChange: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <ReadOnlyField label="Address" value={ingoing.address} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Property type">
          <Input
            value={ingoing.propertyType}
            onChange={(e) => onChange({ ...ingoing, propertyType: e.target.value })}
          />
        </Field>
        <Field label="Priority">
          <select
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            value={ingoing.priority}
            onChange={(e) =>
              onChange({ ...ingoing, priority: e.target.value as 'normal' | 'high' | 'urgent' })
            }
          >
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </Field>
      </div>
      <Field label="Tenant name *">
        <Input
          value={ingoing.tenantName}
          onChange={(e) => onChange({ ...ingoing, tenantName: e.target.value })}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tenant email">
          <Input
            type="email"
            value={ingoing.tenantEmail}
            onChange={(e) => onChange({ ...ingoing, tenantEmail: e.target.value })}
          />
        </Field>
        <Field label="Tenant phone">
          <Input
            value={ingoing.tenantPhone}
            onChange={(e) => onChange({ ...ingoing, tenantPhone: e.target.value })}
          />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Move-in date *">
          <Input
            type="date"
            value={ingoing.moveInDate}
            onChange={(e) => onChange({ ...ingoing, moveInDate: e.target.value })}
          />
        </Field>
      </div>
      {/*
        The "Scheduled inspection" picker was here. CRS-0068 moved that decision to the
        account manager — the move-in date above stays, because it is a fact about the
        tenancy the agent arranged rather than a slot in our diary.
      */}
      <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-2 text-[11px] leading-relaxed">
        {INSPECTION_TIME_REQUEST_HINT}
      </p>
      <Field label="Access instructions">
        <Textarea
          value={ingoing.accessInstructions}
          onChange={(e) => onChange({ ...ingoing, accessInstructions: e.target.value })}
          rows={2}
        />
      </Field>
      <Field label="Notes">
        <Textarea
          value={ingoing.notes ?? ''}
          onChange={(e) => onChange({ ...ingoing, notes: e.target.value })}
          rows={2}
        />
      </Field>
    </div>
  );
}

function RoutineInspectionForm({
  routine,
  onChange,
  isExistingSchedule = false,
}: {
  routine: ReturnType<typeof buildRoutineInspectionPrefill>;
  onChange: (v: ReturnType<typeof buildRoutineInspectionPrefill>) => void;
  isExistingSchedule?: boolean;
}) {
  return (
    <div className="space-y-3">
      <Field label="Inspection flow *">
        <select
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          value={routine.flow}
          onChange={(e) =>
            onChange({ ...routine, flow: e.target.value as 'self' | 'in_person' })
          }
        >
          <option value="self">Tenant self-inspection</option>
          <option value="in_person">In-person inspector visit</option>
        </select>
        <p className="text-muted-foreground text-xs">
          Self-inspection sends the checklist to the tenant app. In-person creates a job for the
          inspector pool when no inspector is named.
        </p>
      </Field>
      {/*
        Frequency, the date picker and the inspector box all went with CRS-0068.
        Cadence is not a preference — it is the property's state (NSW 3 a year, VIC 2), and
        offering it as a dropdown invited an agent to pick a number the regulation had
        already chosen. The date and the inspector are CROSSUB's for the same reason they
        are on every other type.
      */}
      <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-2 text-[11px] leading-relaxed">
        {INSPECTION_TIME_REQUEST_HINT}
      </p>
      <Field label={INSPECTION_TIME_REQUEST_NOTE_LABEL}>
        <Textarea
          value={routine.note}
          onChange={(e) => onChange({ ...routine, note: e.target.value })}
          rows={3}
          placeholder={INSPECTION_TIME_REQUEST_NOTE_PLACEHOLDER}
        />
      </Field>
      <Field label="Tenant name">
        <Input
          value={routine.tenantName}
          onChange={(e) => onChange({ ...routine, tenantName: e.target.value })}
        />
      </Field>
      <Field label="Tenant email">
        <Input
          type="email"
          value={routine.tenantEmail}
          onChange={(e) => onChange({ ...routine, tenantEmail: e.target.value })}
        />
      </Field>
    </div>
  );
}

function OutgoingInspectionForm({
  vacatingCases,
  vacatingCaseId,
  onVacatingCaseIdChange,
  inspector,
  onInspectorChange,
  scheduledLocal,
  onScheduledLocalChange,
}: {
  vacatingCases: import('@/lib/types').VacatingCase[];
  vacatingCaseId: string;
  onVacatingCaseIdChange: (id: string) => void;
  inspector: string;
  onInspectorChange: (v: string) => void;
  scheduledLocal: string;
  onScheduledLocalChange: (v: string) => void;
  propertyId: string;
}) {
  if (vacatingCases.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground text-xs leading-relaxed">
          No end-leasing case on this property — that is expected for Inspection Only (Level 1).
          Request a standalone outgoing inspection and CROSSUB will schedule it.
        </p>
        {/*
          Inspector and time pickers both removed (CRS-0068). They were two halves of the
          same decision: naming an inspector settled who would drive before anyone knew
          when the job would run.
        */}
        <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-2 text-[11px] leading-relaxed">
          {INSPECTION_TIME_REQUEST_HINT}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Field label="Vacating case *">
        <select
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          value={vacatingCaseId}
          onChange={(e) => onVacatingCaseIdChange(e.target.value)}
        >
          {vacatingCases.map((c) => (
            <option key={c.id} value={c.id}>
              {workflowCaseReferenceLabel(c.id, 'end_leasing')} · Vacate {c.vacateDate.slice(0, 10)}{' '}
              · {c.reason}
            </option>
          ))}
        </select>
      </Field>
      {/*
        The inspector and time pickers are gone, and with them the "3 days after the vacate
        date at 9:00 AM" prefill. That default was the problem in its most persuasive form:
        it filled the field with a plausible answer, so the agent confirmed a date rather
        than choosing one, and CROSSUB inherited a booking nobody had actually weighed
        against the inspector's week.
      */}
      <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-2 text-[11px] leading-relaxed">
        {INSPECTION_TIME_REQUEST_HINT}
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input readOnly value={value} className="bg-muted/40" />
    </div>
  );
}
