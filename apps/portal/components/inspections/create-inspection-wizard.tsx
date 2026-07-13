'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  Building2,
  Calendar,
  Loader2,
  Plus,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/components/providers/auth-provider';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { inspectionDetail, propertyDetail, ROUTES } from '@/constants/routes';
import { createAgentIngoingInspection, requestAgentOpenInspection } from '@/lib/crossub-api/agent-workflow-client';
import { inspectionsApi } from '@/lib/inspections-api';
import { mapInspectionRecordToView, mapOpenSessionToInspection } from '@/lib/inspection-mappers';
import {
  defaultOpenInspectionSchedule,
  toDatetimeLocalValue,
} from '@/lib/inspections/outgoing-schedule';
import { openViewingsApi } from '@/lib/open-viewings-api';
import {
  buildAgentContactPrefill,
  buildIngoingInspectionPrefill,
  buildOutgoingInspectionPrefill,
  buildRoutineInspectionPrefill,
  fetchIngoingInspectionPrefill,
  type IngoingInspectionPrefill,
} from '@/lib/property-form-prefill';
import { routineInspectionApi } from '@/lib/routine-inspection-api';
import { terminationApi } from '@/lib/termination-case-api';
import {
  getOpenListingContext,
  OCCUPIED_SELF_TENANT_NOTE,
  OPEN_CONDUCTED_BY_LABEL,
  OPEN_LISTING_CONTEXT_LABEL,
  SELF_OPEN_INSPECTION_DISCLAIMER,
  SELF_OPEN_NEW_LISTING_NOTE,
  type OpenConductedBy,
} from '@/lib/open-inspection';
import type { Inspection, Property } from '@/lib/types';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';
import { cn } from '@/lib/utils';

export type InspectionCreateType = 'OPEN' | 'INGOING' | 'OUTGOING' | 'ROUTINE';

export type InspectionCreateResult = {
  inspectionId: string;
  inspection: Inspection;
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

export function CreateInspectionWizard({
  preselectedPropertyId: preselectedPropertyIdProp,
  initialType: initialTypeProp,
  hideTypePicker: hideTypePickerProp,
  hidePropertySelect: hidePropertySelectProp,
  navigateOnSuccess = true,
  onCreated,
}: {
  preselectedPropertyId?: string | null;
  initialType?: InspectionCreateType | null;
  hideTypePicker?: boolean;
  hidePropertySelect?: boolean;
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

  useEffect(() => {
    if (validPreselected) {
      setPropertyId((current) => current || validPreselected);
    }
  }, [validPreselected]);

  useEffect(() => {
    if (initialType) {
      setInspectionType((current) => current ?? initialType);
    }
  }, [initialType]);

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

  const [openConductedBy, setOpenConductedBy] = useState<OpenConductedBy | null>(null);
  const [openScheduledLocal, setOpenScheduledLocal] = useState('');
  const [openPreferredStartLocal, setOpenPreferredStartLocal] = useState('');
  const [openPreferredEndLocal, setOpenPreferredEndLocal] = useState('');
  const [openPreferredNotes, setOpenPreferredNotes] = useState('');
  const [openAcknowledged, setOpenAcknowledged] = useState(false);
  const [openTenantNotified, setOpenTenantNotified] = useState(false);

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
    flow: 'self' as 'self' | 'in_person',
    inspectorName: '',
  });

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
    if (!propertyId || !inspectionType) return;

    const propertyRow = properties.find((p) => p.id === propertyId);
    if (!propertyRow) return;

    const session = `${propertyId}:${inspectionType}`;
    if (prefillSessionRef.current === session) return;

    const lease = leasingRecords.find(
      (r) =>
        r.propertyId === propertyId && (r.status === 'current' || r.status === 'upcoming'),
    );
    const cycle = leasingCycles.find((c) => c.propertyId === propertyId);
    const vacatingForProperty = vacating.filter((v) => v.propertyId === propertyId);
    const tenantSelectionsForProperty = tenantSelections.filter((t) => t.propertyId === propertyId);

    let cancelled = false;
    setPrefillLoading(true);
    prefillSessionRef.current = session;

    const applyPrefill = async () => {
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
        if (!cancelled) {
          setRoutine(
            buildRoutineInspectionPrefill(propertyRow, {
              currentLease: lease,
              tenantSelections: tenantSelectionsForProperty,
            }),
          );
        }
      }

      if (inspectionType === 'OPEN') {
        if (!cancelled) {
          setOpenScheduledLocal(
            toDatetimeLocalValue(
              defaultOpenInspectionSchedule(propertyRow, cycle?.availableFrom),
            ),
          );
          setOpenConductedBy(null);
          setOpenAcknowledged(false);
          setOpenTenantNotified(false);
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

      if (!cancelled) setPrefillLoading(false);
    };

    void applyPrefill();
    return () => {
      cancelled = true;
    };
  }, [
    propertyId,
    inspectionType,
    properties,
    leasingRecords,
    leasingCycles,
    vacating,
    tenantSelections,
    apiConnected,
  ]);

  const openListingContext = property ? getOpenListingContext(property) : null;
  const isOccupiedOpen = openListingContext === 'occupied';
  const isSelfOpen = openConductedBy === 'agent';

  const finalizeInspectionCreate = (inspection: Inspection) => {
    registerInspection(inspection);
    onCreated?.({ inspectionId: inspection.id, inspection });
    if (navigateOnSuccess) {
      router.push(inspectionDetail(inspection.id));
    }
    void refresh();
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
        if (isSelfOpen && !openAcknowledged) {
          throw new Error('Acknowledge your responsibility for tenant contact');
        }
        if (isSelfOpen && isOccupiedOpen && !openScheduledLocal) {
          throw new Error('Set the open inspection date and time');
        }
        if (isSelfOpen && !openScheduledLocal) {
          throw new Error('Set the open inspection date and time');
        }

        if (openConductedBy === 'crossub' && leasingCycle?.id) {
          if (!openPreferredStartLocal && !openPreferredNotes.trim()) {
            throw new Error('Enter a preferred date and time, or notes for CROSSUB');
          }
          if (
            openPreferredEndLocal &&
            openPreferredStartLocal &&
            new Date(openPreferredEndLocal) <= new Date(openPreferredStartLocal)
          ) {
            throw new Error('Preferred end time must be after the start time');
          }
          await requestAgentOpenInspection(property.id, leasingCycle.id, {
            preferredStartTime: openPreferredStartLocal
              ? new Date(openPreferredStartLocal).toISOString()
              : undefined,
            preferredEndTime: openPreferredEndLocal
              ? new Date(openPreferredEndLocal).toISOString()
              : undefined,
            preferredNotes: openPreferredNotes.trim() || undefined,
          });
          toast.success('Open inspection requested — CROSSUB will confirm the schedule');
          onCreated?.({});
          void refresh();
          return;
        }

        if (openConductedBy === 'crossub' && !openPreferredStartLocal) {
          throw new Error('Enter a preferred date and time for CROSSUB to schedule');
        }

        const scheduledAt = openConductedBy === 'crossub'
          ? new Date(openPreferredStartLocal).toISOString()
          : new Date(openScheduledLocal).toISOString();
        const start = scheduledAt;
        const end = openConductedBy === 'crossub' && openPreferredEndLocal
          ? new Date(openPreferredEndLocal).toISOString()
          : new Date(new Date(start).getTime() + 60 * 60_000).toISOString();
        const session = await openViewingsApi.create({
          propertyId: property.id,
          startTime: start,
          endTime: end,
          shortNote: openConductedBy === 'crossub' ? openPreferredNotes : undefined,
          agentName: agentContact.agentName || undefined,
          agentPhone: agentContact.agentPhone || undefined,
          agentRole: 'leasing_agent',
        });
        const view = mapOpenSessionToInspection(session, property.id);
        toast.success(
          openConductedBy === 'crossub'
            ? 'Open inspection requested'
            : 'Open inspection scheduled',
        );
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
          leaseApprovalRef: ingoing.leaseApprovalRef.trim() || undefined,
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
        toast.success('Routine inspection schedule created');
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
        <section className="space-y-4 rounded-xl border bg-card p-4">
          <div className="bg-secondary/20 rounded-lg border p-3 text-xs">
            <p className="font-medium">Auto-filled from portfolio</p>
            <p className="text-muted-foreground mt-1">
              {property?.address}, {property?.suburb}
              {prefillLoading ? ' · Loading lease details…' : ' · Review and adjust before submitting.'}
            </p>
          </div>

          {prefillLoading ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Prefilling form…
            </div>
          ) : (
            <>
              {inspectionType === 'OPEN' && property ? (
                <OpenInspectionForm
                  property={property}
                  listingContext={openListingContext}
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
                <RoutineInspectionForm routine={routine} onChange={setRoutine} />
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
                disabled={submitting || prefillLoading || !apiConnected}
                onClick={() => void submit()}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  'Create inspection'
                )}
              </Button>
            </>
          )}
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
}: {
  property: Property;
  listingContext: ReturnType<typeof getOpenListingContext> | null;
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
}) {
  const isOccupied = listingContext === 'occupied';
  const isSelf = conductedBy === 'agent';

  return (
    <div className="space-y-4">
      {listingContext && (
        <div className="rounded-xl border bg-card p-3 text-xs">
          <p className="font-semibold">{OPEN_LISTING_CONTEXT_LABEL[listingContext]}</p>
          <p className="text-muted-foreground mt-1">
            {isOccupied
              ? `${property.tenantName ?? 'Tenant'} is the current tenant.`
              : 'Vacant or new listing.'}
          </p>
        </div>
      )}

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

      {isSelf ? <Callout body={SELF_OPEN_INSPECTION_DISCLAIMER} /> : null}

      {conductedBy === 'crossub' ? (
        <>
          <Field label="Preferred date & time">
            <Input
              type="datetime-local"
              value={preferredStartLocal}
              onChange={(e) => onPreferredStartLocalChange(e.target.value)}
            />
          </Field>
          <Field label="Preferred end time (optional)">
            <Input
              type="datetime-local"
              value={preferredEndLocal}
              onChange={(e) => onPreferredEndLocalChange(e.target.value)}
            />
          </Field>
          <Field label="Notes for CROSSUB (optional)">
            <Textarea
              value={preferredNotes}
              onChange={(e) => onPreferredNotesChange(e.target.value)}
              rows={3}
              placeholder="e.g. Saturdays preferred, tenant needs 24h notice…"
            />
          </Field>
          <p className="text-muted-foreground text-xs">
            This is your preference only. CROSSUB will confirm the official schedule in the
            admin portal before the viewing is advertised.
          </p>
        </>
      ) : conductedBy === 'agent' ? (
        <>
          <Callout body={isOccupied ? OCCUPIED_SELF_TENANT_NOTE : SELF_OPEN_NEW_LISTING_NOTE} />
          {isOccupied ? <TenantContactCard property={property} /> : null}
          <Field label="Open inspection date & time *">
            <Input
              type="datetime-local"
              value={scheduledLocal}
              onChange={(e) => onScheduledLocalChange(e.target.value)}
            />
          </Field>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-xs">
            <input
              type="checkbox"
              className="mt-1"
              checked={acknowledged}
              onChange={(e) => onAcknowledgedChange(e.target.checked)}
            />
            <span>
              I understand CROSSUB is not responsible for contacting the{' '}
              {isOccupied ? 'tenant' : 'prospects'} or arranging timing.
            </span>
          </label>
          {isOccupied ? (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-xs">
              <input
                type="checkbox"
                className="mt-1"
                checked={tenantNotified}
                onChange={(e) => onTenantNotifiedChange(e.target.checked)}
              />
              <span>I have notified the tenant of the open inspection (optional).</span>
            </label>
          ) : null}
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
      <Field label="Lease approval reference">
        <Input
          value={ingoing.leaseApprovalRef}
          onChange={(e) => onChange({ ...ingoing, leaseApprovalRef: e.target.value })}
        />
      </Field>
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
}: {
  routine: ReturnType<typeof buildRoutineInspectionPrefill>;
  onChange: (v: ReturnType<typeof buildRoutineInspectionPrefill>) => void;
}) {
  return (
    <div className="space-y-3">
      <Field label="Inspection flow *">
        <select
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          value={routine.flow}
          onChange={(e) => onChange({ ...routine, flow: e.target.value as 'self' | 'in_person' })}
        >
          <option value="self">Tenant self-inspection</option>
          <option value="in_person">In-person inspector visit</option>
        </select>
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
      <Field label="First scheduled date">
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

function TenantContactCard({ property }: { property: Property }) {
  return (
    <div className="rounded-xl border bg-card p-4 text-xs">
      <div className="mb-2 flex items-center gap-2">
        <User className="text-primary size-4" />
        <p className="font-semibold">Tenant to notify</p>
      </div>
      <p className="font-medium">{property.tenantName}</p>
      {property.tenantContact.email ? (
        <p className="text-primary mt-1">{property.tenantContact.email}</p>
      ) : null}
      {property.tenantContact.phone ? <p>{property.tenantContact.phone}</p> : null}
      <p className="text-muted-foreground mt-2 flex items-start gap-1.5">
        <Calendar className="mt-0.5 size-3 shrink-0" />
        Contact the tenant yourself before the open inspection.
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

function Callout({ body }: { body: string }) {
  return (
    <div className="flex gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
      <p>{body}</p>
    </div>
  );
}
