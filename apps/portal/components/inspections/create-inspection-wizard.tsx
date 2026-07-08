'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  ClipboardList,
  DoorOpen,
  Home,
  Loader2,
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
import { inspectionsApi } from '@/lib/inspections-api';
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
import type { Property } from '@/lib/types';
import type { IngoingInspectionPrefill } from '@/lib/property-form-prefill';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';
import { cn } from '@/lib/utils';

export type InspectionCreateType = 'OPEN' | 'INGOING' | 'OUTGOING' | 'ROUTINE';

type WizardStep = 'type' | 'property' | 'form';

const TYPE_OPTIONS: {
  id: InspectionCreateType;
  label: string;
  description: string;
  icon: typeof DoorOpen;
}[] = [
  {
    id: 'OPEN',
    label: 'Open inspection',
    description: 'Prospect viewing for a vacant or new listing.',
    icon: DoorOpen,
  },
  {
    id: 'INGOING',
    label: 'Ingoing inspection',
    description: 'Move-in condition report before a new tenant.',
    icon: Home,
  },
  {
    id: 'OUTGOING',
    label: 'Outgoing inspection',
    description: 'End-of-lease condition report after vacating.',
    icon: Home,
  },
  {
    id: 'ROUTINE',
    label: 'Routine inspection',
    description: 'Scheduled self or in-person routine check.',
    icon: ClipboardList,
  },
];

export function CreateInspectionWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPropertyId = searchParams.get('property');
  const typeParam = searchParams.get('type') as InspectionCreateType | null;

  const {
    properties,
    leasingRecords,
    leasingCycles,
    vacating,
    primaryAgency,
    apiConnected,
    refresh,
    addOpenInspection,
  } = useAgentData();
  const { user } = useAuth();

  const validPreselected =
    preselectedPropertyId && properties.some((p) => p.id === preselectedPropertyId)
      ? preselectedPropertyId
      : null;

  const initialType =
    typeParam && TYPE_OPTIONS.some((t) => t.id === typeParam) ? typeParam : null;

  const [step, setStep] = useState<WizardStep>(validPreselected && initialType ? 'form' : 'type');
  const [inspectionType, setInspectionType] = useState<InspectionCreateType | null>(initialType);
  const [propertyId, setPropertyId] = useState(validPreselected ?? '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!validPreselected) return;
    setPropertyId(validPreselected);
    if (initialType) {
      setInspectionType(initialType);
      setStep('form');
    }
  }, [validPreselected, initialType]);

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

  // --- Open form state ---
  const [openConductedBy, setOpenConductedBy] = useState<OpenConductedBy | null>(null);
  const [openScheduledLocal, setOpenScheduledLocal] = useState('');
  const [openPreferredNotes, setOpenPreferredNotes] = useState('');
  const [openAcknowledged, setOpenAcknowledged] = useState(false);
  const [openTenantNotified, setOpenTenantNotified] = useState(false);

  // --- Ingoing form state ---
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

  // --- Routine form state ---
  const [routine, setRoutine] = useState({
    tenantName: '',
    tenantEmail: '',
    scheduledDate: '',
    frequency: 2 as 2 | 3,
    flow: 'self' as 'self' | 'in_person',
    inspectorName: '',
  });

  // --- Outgoing form state ---
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
    if (!property || !inspectionType) return;

    if (inspectionType === 'INGOING') {
      const prefill = buildIngoingInspectionPrefill(property, currentLease, leasingCycle);
      setIngoing(prefill);
      setIngoingScheduledLocal(toDatetimeLocalValue(prefill.scheduledTime));
    }

    if (inspectionType === 'ROUTINE') {
      setRoutine(buildRoutineInspectionPrefill(property));
    }

    if (inspectionType === 'OPEN') {
      setOpenScheduledLocal(
        toDatetimeLocalValue(
          defaultOpenInspectionSchedule(property, leasingCycle?.availableFrom),
        ),
      );
      setOpenConductedBy(null);
      setOpenAcknowledged(false);
      setOpenTenantNotified(false);
    }

    if (inspectionType === 'OUTGOING') {
      const activeCase = propertyVacating[0];
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
  }, [property, inspectionType, currentLease, leasingCycle, propertyVacating]);

  const openListingContext = property ? getOpenListingContext(property) : null;
  const isOccupiedOpen = openListingContext === 'occupied';
  const isSelfOpen = openConductedBy === 'agent';

  const selectType = (type: InspectionCreateType) => {
    setInspectionType(type);
    if (validPreselected) {
      setStep('form');
    } else {
      setStep('property');
    }
  };

  const submit = async () => {
    if (!property || !inspectionType) return;
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
        const scheduledAt = openScheduledLocal
          ? new Date(openScheduledLocal).toISOString()
          : undefined;

        if (apiConnected) {
          const start = scheduledAt ?? new Date().toISOString();
          const end = new Date(new Date(start).getTime() + 60 * 60_000).toISOString();
          const session = await openViewingsApi.create({
            propertyId: property.id,
            startTime: start,
            endTime: end,
            shortNote: openConductedBy === 'crossub' ? openPreferredNotes : undefined,
            agentName: agentContact.agentName || undefined,
            agentPhone: agentContact.agentPhone || undefined,
            agentRole: 'leasing_agent',
          });
          await refresh();
          toast.success(
            openConductedBy === 'crossub'
              ? 'Open inspection requested'
              : 'Open inspection scheduled',
          );
          router.push(inspectionDetail(session.id));
          return;
        }

        const inspection = await addOpenInspection({
          property,
          openConductedBy,
          openListingContext: openListingContext!,
          scheduledAt,
          preferredNotes: openConductedBy === 'crossub' ? openPreferredNotes : undefined,
          agentTenantNotifiedConfirmed: isSelfOpen ? openTenantNotified : undefined,
        });
        toast.success(
          openConductedBy === 'crossub'
            ? 'Open inspection requested'
            : 'Open inspection scheduled',
        );
        router.push(inspectionDetail(inspection.id));
        return;
      }

      if (inspectionType === 'INGOING') {
        if (!ingoing.tenantName.trim()) throw new Error('Tenant name is required');
        if (!ingoing.moveInDate) throw new Error('Move-in date is required');
        const created = await inspectionsApi.createIngoing({
          propertyId: property.id,
          moveInDate: ingoing.moveInDate,
          scheduledTime: ingoingScheduledLocal
            ? new Date(ingoingScheduledLocal).toISOString()
            : ingoing.scheduledTime || undefined,
          tenantName: ingoing.tenantName.trim(),
          tenantEmail: ingoing.tenantEmail.trim() || undefined,
          tenantPhone: ingoing.tenantPhone.trim() || undefined,
          priority: ingoing.priority,
          accessInstructions: ingoing.accessInstructions.trim() || undefined,
          notes: ingoing.notes?.trim() || undefined,
          leaseApprovalRef: ingoing.leaseApprovalRef.trim() || undefined,
        });
        await refresh();
        toast.success('Ingoing inspection created');
        router.push(inspectionDetail(created.id));
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
        await refresh();
        const inspectionId = schedule.currentInspection?.id;
        toast.success('Routine inspection schedule created');
        if (inspectionId) {
          router.push(inspectionDetail(inspectionId));
        } else {
          router.push(ROUTES.INSPECTIONS);
        }
        return;
      }

      if (inspectionType === 'OUTGOING') {
        if (!vacatingCaseId) throw new Error('Select a vacating case');
        if (!outgoingScheduledLocal) throw new Error('Scheduled date is required');
        await terminationApi.scheduleInspection(vacatingCaseId, {
          inspector: outgoingInspector.trim() || 'Pending assignment',
          date: new Date(outgoingScheduledLocal).toISOString(),
        });
        await refresh();
        toast.success('Outgoing inspection scheduled');
        router.push(`${ROUTES.INSPECTIONS}?type=OUTGOING`);
        return;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create inspection');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <StepBar step={step} />

      {step === 'type' && (
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold">What type of inspection?</h2>
            <p className="text-muted-foreground mt-1 text-xs">
              Choose the inspection type, then pick a property. Fields are prefilled from your
              portfolio where possible.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {TYPE_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => selectType(option.id)}
                  className={cn(
                    'rounded-2xl border bg-card p-4 text-left transition hover:bg-secondary/30',
                    inspectionType === option.id && 'border-primary ring-1 ring-primary/20',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{option.label}</p>
                      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {step === 'property' && inspectionType && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">Select property</h2>
              <p className="text-muted-foreground text-xs">
                {TYPE_OPTIONS.find((t) => t.id === inspectionType)?.label}
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setStep('type')}>
              Back
            </Button>
          </div>
          <div className="max-h-[50vh] space-y-2 overflow-y-auto">
            {properties.map((p) => (
              <PropertyOption
                key={p.id}
                property={p}
                selected={propertyId === p.id}
                onSelect={() => {
                  setPropertyId(p.id);
                  setStep('form');
                }}
              />
            ))}
          </div>
        </section>
      )}

      {step === 'form' && property && inspectionType && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">
                {TYPE_OPTIONS.find((t) => t.id === inspectionType)?.label}
              </h2>
              <p className="text-muted-foreground text-xs">
                {property.address}, {property.suburb}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStep(validPreselected ? 'type' : 'property')}
            >
              Back
            </Button>
          </div>

          <div className="bg-secondary/20 rounded-xl border p-3 text-xs">
            <p className="font-medium">Auto-filled from portfolio</p>
            <p className="text-muted-foreground mt-1">
              Tenant, lease, and schedule fields are prefilled where available. Review and adjust
              before submitting.
            </p>
          </div>

          {inspectionType === 'OPEN' && (
            <OpenInspectionForm
              property={property}
              listingContext={openListingContext}
              conductedBy={openConductedBy}
              onConductedByChange={setOpenConductedBy}
              scheduledLocal={openScheduledLocal}
              onScheduledLocalChange={setOpenScheduledLocal}
              preferredNotes={openPreferredNotes}
              onPreferredNotesChange={setOpenPreferredNotes}
              acknowledged={openAcknowledged}
              onAcknowledgedChange={setOpenAcknowledged}
              tenantNotified={openTenantNotified}
              onTenantNotifiedChange={setOpenTenantNotified}
            />
          )}

          {inspectionType === 'INGOING' && (
            <IngoingInspectionForm
              ingoing={ingoing}
              onChange={setIngoing}
              scheduledLocal={ingoingScheduledLocal}
              onScheduledLocalChange={setIngoingScheduledLocal}
            />
          )}

          {inspectionType === 'ROUTINE' && (
            <RoutineInspectionForm routine={routine} onChange={setRoutine} />
          )}

          {inspectionType === 'OUTGOING' && (
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
          )}

          <Button className="h-11 w-full rounded-xl" disabled={submitting} onClick={() => void submit()}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating…
              </>
            ) : (
              'Create inspection'
            )}
          </Button>
        </section>
      )}
    </div>
  );
}

function StepBar({ step }: { step: WizardStep }) {
  const steps = [
    { id: 'type', label: 'Type' },
    { id: 'property', label: 'Property' },
    { id: 'form', label: 'Details' },
  ] as const;
  const index = steps.findIndex((s) => s.id === step);
  return (
    <div className="flex gap-1">
      {steps.map((s, i) => (
        <div
          key={s.id}
          className={cn('h-1 flex-1 rounded-full', i <= index ? 'bg-primary' : 'bg-secondary')}
          title={s.label}
        />
      ))}
    </div>
  );
}

function PropertyOption({
  property,
  selected,
  onSelect,
}: {
  property: Property;
  selected: boolean;
  onSelect: () => void;
}) {
  const context = getOpenListingContext(property);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition',
        selected ? 'border-primary bg-primary/5' : 'hover:bg-secondary/50',
      )}
    >
      <Building2 className="text-primary mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {property.address}, {property.suburb}
        </p>
        <p className="text-muted-foreground text-xs">
          {OPEN_LISTING_CONTEXT_LABEL[context]}
          {property.tenantName ? ` · ${property.tenantName}` : ''}
        </p>
      </div>
      {selected && <Check className="text-primary size-4 shrink-0" />}
    </button>
  );
}

function OpenInspectionForm({
  property,
  listingContext,
  conductedBy,
  onConductedByChange,
  scheduledLocal,
  onScheduledLocalChange,
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

      {isSelf && (
        <Callout body={SELF_OPEN_INSPECTION_DISCLAIMER} />
      )}

      {conductedBy === 'crossub' ? (
        <Field label="Preferred dates or notes (optional)">
          <Textarea
            value={preferredNotes}
            onChange={(e) => onPreferredNotesChange(e.target.value)}
            rows={3}
            placeholder="e.g. Saturdays preferred, after 2pm…"
          />
        </Field>
      ) : conductedBy === 'agent' ? (
        <>
          <Callout body={isOccupied ? OCCUPIED_SELF_TENANT_NOTE : SELF_OPEN_NEW_LISTING_NOTE} />
          {isOccupied && <TenantContactCard property={property} />}
          <Field label={isOccupied ? 'Open inspection date & time *' : 'Open inspection date & time'}>
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
          {isOccupied && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-xs">
              <input
                type="checkbox"
                className="mt-1"
                checked={tenantNotified}
                onChange={(e) => onTenantNotifiedChange(e.target.checked)}
              />
              <span>I have notified the tenant of the open inspection (optional).</span>
            </label>
          )}
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
  ingoing: ReturnType<typeof buildIngoingInspectionPrefill>;
  onChange: (v: ReturnType<typeof buildIngoingInspectionPrefill>) => void;
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
      {routine.flow === 'in_person' && (
        <Field label="Inspector name">
          <Input
            value={routine.inspectorName}
            onChange={(e) => onChange({ ...routine, inspectorName: e.target.value })}
            placeholder="Pending assignment"
          />
        </Field>
      )}
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
          Start an end-leasing / vacating case on the property first, then schedule the outgoing
          inspection.
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
              {workflowCaseReferenceLabel(c.id, 'end_leasing')} · Vacate {c.vacateDate.slice(0, 10)} ·{' '}
              {c.reason}
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
      {property.tenantContact.email && <p className="text-primary mt-1">{property.tenantContact.email}</p>}
      {property.tenantContact.phone && <p>{property.tenantContact.phone}</p>}
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
