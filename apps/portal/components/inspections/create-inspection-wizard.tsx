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
import { createAgentIngoingInspection, createAgentLeasingCycle, requestAgentOpenInspection } from '@/lib/crossub-api/agent-workflow-client';
import { inspectionsApi } from '@/lib/inspections-api';
import { mapInspectionRecordToView, mapOpenSessionToInspection } from '@/lib/inspection-mappers';
import {
  defaultOpenInspectionSchedule,
  toDatetimeLocalValue,
} from '@/lib/inspections/outgoing-schedule';
import { openViewingsApi } from '@/lib/open-viewings-api';
import {
  validateCrossubOpenDateTimeLocal,
} from '@/lib/open-inspection/open-inspection-saturday';
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
import { terminationApi } from '@/lib/termination-case-api';
import { inspectionReferenceLabel } from '@/lib/workflow-case-reference';
import { resolveOpenInspectionForCycle } from '@/lib/open-inspection-resolve';
import {
  getOpenListingContext,
  OPEN_CONDUCTED_BY_LABEL,
  type OpenConductedBy,
} from '@/lib/open-inspection';
import type { Inspection, Property } from '@/lib/types';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';
import { cn, formatPropertyFullAddress } from '@/lib/utils';

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
                  flow: schedule.flow,
                  scheduledDate:
                    schedule.nextInspectionDate?.slice(0, 10) ?? basePrefill.scheduledDate,
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
              setOutgoingScheduledLocal('');
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
  const manualStandaloneCrossubOpen =
    !leasingCycleIdProp && openConductedBy === 'crossub';
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

        if (isSelfOpen && !leasingCycleIdProp) {
          if (leasingCycle?.id) {
            throw new Error('An active letting already exists for this property');
          }
          const prefill = buildLeasingCyclePrefill(property, currentLease);
          const rent = Number(prefill.rentPerWeek);
          if (!rent || rent <= 0) {
            throw new Error('Set weekly rent on the property before creating a letting');
          }
          const tenantMovedOut = isPropertyVacant(
            property,
            currentLease ? [currentLease] : [],
          );
          const result = await createAgentLeasingCycle(property.id, {
            rentPerWeek: rent,
            availableFrom: new Date(prefill.availableFrom).toISOString(),
            fixedTermWeeks: 52,
            tenantMovedOut,
            skipOpenInspection: true,
            agentConductsOpenInspection: true,
          });
          toast.success('New leasing created — you conduct the open inspection');
          await finalizeAgentSelfOpenLeasing(result.id, rent);
          return;
        }

        if (openConductedBy === 'crossub' && leasingCycleIdProp) {
          const cycleId = leasingCycleIdProp;
          if (!cycleId) {
            throw new Error(
              'Letting cycle is not ready — close and reopen the workflow, then try again',
            );
          }
          if (!openPreferredStartLocal) {
            throw new Error('Enter a viewing start date and time');
          }
          if (!openPreferredEndLocal) {
            throw new Error('Enter a viewing end date and time');
          }
          const startError = validateCrossubOpenDateTimeLocal(
            openPreferredStartLocal,
            'Viewing start date & time',
          );
          if (startError) throw new Error(startError);
          const endError = validateCrossubOpenDateTimeLocal(
            openPreferredEndLocal,
            'Viewing end date & time',
          );
          if (endError) throw new Error(endError);
          if (new Date(openPreferredEndLocal) <= new Date(openPreferredStartLocal)) {
            throw new Error('Viewing end time must be after the start time');
          }
          const result = await requestAgentOpenInspection(property.id, cycleId, {
            preferredStartTime: new Date(openPreferredStartLocal).toISOString(),
            preferredEndTime: new Date(openPreferredEndLocal).toISOString(),
            preferredNotes: openPreferredNotes.trim() || undefined,
          });
          toast.success('Open inspection scheduled');
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
          return;
        }

        if (openConductedBy === 'crossub' && !openPreferredStartLocal) {
          throw new Error('Enter a preferred date and time for CROSSUB to schedule');
        }
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
          if (!openPreferredStartLocal) {
            throw new Error('Enter a viewing start date and time');
          }
          if (!openPreferredEndLocal) {
            throw new Error('Enter a viewing end date and time');
          }
          const startError = validateCrossubOpenDateTimeLocal(
            openPreferredStartLocal,
            'Viewing start date & time',
          );
          if (startError) throw new Error(startError);
          const endError = validateCrossubOpenDateTimeLocal(
            openPreferredEndLocal,
            'Viewing end date & time',
          );
          if (endError) throw new Error(endError);
          if (new Date(openPreferredEndLocal) <= new Date(openPreferredStartLocal)) {
            throw new Error('Viewing end time must be after the start time');
          }
          const rent = Number(openPreferredRentPerWeek);
          const fixedTermWeeks = resolveStandaloneOpenLeaseTermWeeks(
            openLeaseTermChoice,
            openCustomLeaseTermWeeks,
          );
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
          const result = await requestAgentOpenInspection(property.id, cycleId, {
            preferredStartTime: new Date(openPreferredStartLocal).toISOString(),
            preferredEndTime: new Date(openPreferredEndLocal).toISOString(),
            preferredNotes: openPreferredNotes.trim() || undefined,
          });
          toast.success(
            leasingCycle?.id
              ? 'Open inspection scheduled'
              : 'New leasing created and open inspection scheduled',
          );
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
          if (navigateOnSuccess && !inspection) {
            router.push(propertyLeasingWorkflow(property.id));
          } else if (navigateOnSuccess && inspection) {
            router.push(inspectionDetail(inspection.id));
          }
          return;
        }

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
        toast.success('Open inspection requested');
        finalizeInspectionCreate(view);
        return;
      }

      if (inspectionType === 'INGOING') {
        if (!ingoing.tenantName.trim()) throw new Error('Tenant name is required');
        if (!ingoing.moveInDate) throw new Error('Move-in date is required');
        const scheduledTime = ingoingScheduledLocal
          ? new Date(ingoingScheduledLocal).toISOString()
          : ingoing.scheduledTime || undefined;
        const created = await createAgentIngoingInspection(property.id, {
          moveInDate: ingoing.moveInDate,
          scheduledTime,
          tenantName: ingoing.tenantName.trim(),
          tenantEmail: ingoing.tenantEmail.trim() || undefined,
          tenantPhone: ingoing.tenantPhone.trim() || undefined,
          priority: ingoing.priority,
          accessInstructions: ingoing.accessInstructions.trim() || undefined,
          notes: ingoing.notes?.trim() || undefined,
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
            scheduledAt: scheduledTime,
            status: 'Scheduled',
            reportStatus: 'pending',
            createdAt: new Date().toISOString(),
            timeline: [],
            source: 'inspection',
          };
        }
        toast.success('Ingoing inspection created');
        finalizeInspectionCreate(view);
        return;
      }

      if (inspectionType === 'ROUTINE') {
        const finalizeRoutineSchedule = async (schedule: Awaited<
          ReturnType<typeof routineInspectionApi.create>
        >) => {
          const inspectionId = schedule.currentInspection?.id;
          let view: Inspection | null = null;
          if (inspectionId) {
            try {
              const record = await inspectionsApi.get(inspectionId);
              view = mapInspectionRecordToView(record);
            } catch {
              view = null;
            }
          }
          if (view) {
            finalizeInspectionCreate(view);
          } else {
            void refresh();
            if (navigateOnSuccess) {
              if (inspectionId) {
                router.push(inspectionDetail(inspectionId));
              } else {
                router.push(ROUTES.INSPECTIONS);
              }
            }
          }
        };

        if (existingRoutineSchedule) {
          if (!routine.scheduledDate.trim()) {
            throw new Error('Next inspection date is required');
          }
          let schedule = await routineInspectionApi.override(existingRoutineSchedule.id, {
            nextInspectionDate: routine.scheduledDate,
            frequency: routine.frequency,
            reason: 'agent_requested_cycle',
            reasonNote: 'Updated via agent portal routine scheduler',
          });
          if (routine.flow !== existingRoutineSchedule.flow) {
            schedule = await routineInspectionApi.changeFlow(existingRoutineSchedule.id, {
              flow: routine.flow,
              reason: 'agent_requested_cycle',
              reasonNote: 'Updated conduct mode via agent portal routine scheduler',
            });
          }

          const instanceStatus =
            schedule.currentInspection?.status ??
            existingRoutineSchedule.currentInspectionStatus;
          const needsNewInstance = routineScheduleNeedsNewInstance(instanceStatus);
          if (isActiveRoutineInspectionStatus(instanceStatus)) {
            schedule = await routineInspectionApi.restart(existingRoutineSchedule.id, {
              scheduledDate: routine.scheduledDate,
              inspectorName:
                routine.flow === 'in_person'
                  ? routine.inspectorName.trim() || undefined
                  : undefined,
              reason:
                'Superseded — agent scheduled a new routine inspection case from the portal.',
            });
            toast.success('Previous routine case cancelled — new case created');
          } else if (needsNewInstance) {
            schedule = await routineInspectionApi.start(existingRoutineSchedule.id, {
              scheduledDate: routine.scheduledDate,
              inspectorName:
                routine.flow === 'in_person'
                  ? routine.inspectorName.trim() || undefined
                  : undefined,
            });
            toast.success('Next routine inspection scheduled');
          } else {
            toast.success('Routine inspection schedule updated');
          }
          await finalizeRoutineSchedule(schedule);
          return;
        }

        const schedule = await routineInspectionApi.create({
          propertyId: property.id,
          flow: routine.flow,
          frequency: routine.frequency,
          scheduledDate: routine.scheduledDate || undefined,
          tenantName: routine.tenantName.trim() || undefined,
          tenantEmail: routine.tenantEmail.trim() || undefined,
          inspectorName:
            routine.flow === 'in_person' ? routine.inspectorName.trim() || undefined : undefined,
        });
        toast.success('Routine inspection schedule created');
        await finalizeRoutineSchedule(schedule);
        return;
      }

      if (inspectionType === 'OUTGOING') {
        if (!vacatingCaseId) throw new Error('Select a vacating case');
        if (!outgoingScheduledLocal) throw new Error('Scheduled date is required');
        const updatedCase = await terminationApi.scheduleInspection(vacatingCaseId, {
          inspector: outgoingInspector.trim() || 'Pending assignment',
          date: new Date(outgoingScheduledLocal).toISOString(),
        });
        const inspectionId = updatedCase.inspection?.inspectionId ?? undefined;
        let view: Inspection | null = null;
        if (inspectionId) {
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
              scheduledAt: new Date(outgoingScheduledLocal).toISOString(),
              status: 'Scheduled',
              reportStatus: 'pending',
              createdAt: new Date().toISOString(),
              timeline: [],
              source: 'inspection',
            };
          }
        }
        toast.success('Outgoing inspection scheduled');
        if (view) {
          finalizeInspectionCreate(view);
        } else {
          void refresh();
          if (navigateOnSuccess) router.push(`${ROUTES.INSPECTIONS}?type=OUTGOING`);
        }
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
                  showTenantMovedOut={manualStandaloneCrossubOpen && !propertyIsVacant}
                  showListingFields={manualStandaloneCrossubOpen}
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
  /** Standalone CROSSUB open — rent / term / available-from (independent of tenant-moved-out). */
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
        </div>
      ) : null}

      {conductedBy === 'crossub' ? (
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
                  The current tenant&apos;s details will appear on the job case for CROSSUB to contact them.
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
          <Field label={leasingRequestMode ? 'Viewing start date & time *' : 'Preferred start date & time'}>
            <Input
              type="datetime-local"
              value={preferredStartLocal}
              onChange={(e) => onPreferredStartLocalChange(e.target.value)}
            />
            {leasingRequestMode || conductedBy === 'crossub' ? (
              <p className="text-muted-foreground mt-1 text-[11px]">
                CROSSUB open inspections must be on a Saturday (Sydney time).
              </p>
            ) : null}
          </Field>
          <Field
            label={
              leasingRequestMode
                ? 'Viewing end date & time *'
                : 'Preferred end date & time (optional)'
            }
          >
            <Input
              type="datetime-local"
              value={preferredEndLocal}
              onChange={(e) => onPreferredEndLocalChange(e.target.value)}
            />
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
            {leasingRequestMode
              ? 'Choose a Saturday — CROSSUB assigns an inspector from the task pool.'
              : 'CROSSUB open inspections are scheduled on Saturdays only.'}
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
        <Field label="Scheduled inspection">
          <Input
            type="datetime-local"
            value={scheduledLocal}
            onChange={(e) => onScheduledLocalChange(e.target.value)}
          />
        </Field>
      </div>
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
      <Field label="Frequency (per year) *">
        <select
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          value={routine.frequency}
          onChange={(e) => onChange({ ...routine, frequency: Number(e.target.value) as 2 | 3 })}
        >
          <option value={2}>Twice per year (every 6 months)</option>
          <option value={3}>Three times per year (every 4 months)</option>
        </select>
      </Field>
      <Field label={isExistingSchedule ? 'Next inspection date *' : 'First scheduled date'}>
        <Input
          type="date"
          value={routine.scheduledDate}
          onChange={(e) => onChange({ ...routine, scheduledDate: e.target.value })}
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
      {routine.flow === 'in_person' ? (
        <Field label="Inspector name">
          <Input
            value={routine.inspectorName}
            onChange={(e) => onChange({ ...routine, inspectorName: e.target.value })}
            placeholder="Pending assignment"
          />
        </Field>
      ) : null}
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
  propertyId,
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
      <div className="rounded-xl border border-dashed p-4 text-center text-xs">
        <p className="font-medium">No vacating case for this property</p>
        <p className="text-muted-foreground mt-1">
          Start an end-leasing case on the property first, then schedule the outgoing inspection.
        </p>
        <Button asChild size="sm" className="mt-3" variant="outline">
          <Link href={propertyDetail(propertyId)}>Open property</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Field label="Vacating case *">
        <select
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          value={vacatingCaseId}
          onChange={(e) => {
            const next = vacatingCases.find((c) => c.id === e.target.value);
            onVacatingCaseIdChange(e.target.value);
            if (next) {
              const prefill = buildOutgoingInspectionPrefill(next);
              onInspectorChange(prefill.inspector);
              onScheduledLocalChange(toDatetimeLocalValue(prefill.scheduledAt));
            }
          }}
        >
          {vacatingCases.map((c) => (
            <option key={c.id} value={c.id}>
              {workflowCaseReferenceLabel(c.id, 'end_leasing')} · Vacate {c.vacateDate.slice(0, 10)}{' '}
              · {c.reason}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Inspector">
        <Input value={inspector} onChange={(e) => onInspectorChange(e.target.value)} />
      </Field>
      <Field label="Scheduled inspection *">
        <Input
          type="datetime-local"
          value={scheduledLocal}
          onChange={(e) => onScheduledLocalChange(e.target.value)}
        />
      </Field>
      <p className="text-muted-foreground text-[11px]">
        Default schedule is 3 days after the vacate date at 9:00 AM (same as CROSSUB web).
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
