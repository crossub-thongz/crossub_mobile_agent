'use client';

import { useMemo, useState } from 'react';
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
import { useAuth } from '@/components/providers/auth-provider';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  createAgentLeasingCycle,
  createAgentMaintenanceRequest,
  createAgentRentReview,
  createAgentTerminationCase,
} from '@/lib/crossub-api/agent-workflow-client';
import { inspectionsApi } from '@/lib/inspections-api';
import {
  buildAgentContactPrefill,
  buildIngoingInspectionPrefill,
  buildLeasingCyclePrefill,
  buildMaintenancePrefill,
  buildRentReviewPrefill,
  buildTerminationPrefill,
  LEASING_CYCLE_AVAILABLE_FROM_MIN_DAYS,
  minLeasingCycleAvailableFrom,
  recalcLeasingDepositBond,
} from '@/lib/property-form-prefill';
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
  TribunalCase,
  VacatingCase,
} from '@/lib/types';
import { cn } from '@/lib/utils';

const TERMINATION_GROUNDS = [
  { value: 'landlord_resides', label: 'Landlord requires residence' },
  { value: 'sale', label: 'Sale of premises' },
  { value: 'demolition', label: 'Demolition / redevelopment' },
  { value: 'breach', label: 'Breach of agreement' },
] as const;

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
  emptyTitle = 'No activity yet',
  emptyDescription,
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
  emptyTitle?: string;
  emptyDescription?: string;
  onCreated?: () => void;
}) {
  const { primaryAgency } = useAgentData();
  const { user } = useAuth();
  const userName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
    : '';

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

      <PropertyWorkflowCreateDialog
        actionId={activeAction}
        open={activeAction != null && activeAction !== 'open_tribunal'}
        onOpenChange={(open) => {
          if (!open) setActiveAction(null);
        }}
        property={property}
        propertyId={propertyId}
        agency={primaryAgency}
        userName={userName}
        currentLease={currentLease}
        leasingCycle={ctx.leasingCycles[0]}
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
      onClick={onClick}
    >
      <Plus className="size-3.5" />
      {action.label}
    </Button>
  );
}

function PropertyWorkflowCreateDialog({
  actionId,
  open,
  onOpenChange,
  property,
  propertyId,
  agency,
  userName,
  currentLease,
  leasingCycle,
  onSuccess,
}: {
  actionId: PropertyWorkflowActionId | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property;
  propertyId: string;
  agency: ReturnType<typeof useAgentData>['primaryAgency'];
  userName: string;
  currentLease?: LeasingRecord;
  leasingCycle?: LeasingCycle;
  onSuccess: () => void;
}) {
  const { refresh } = useAgentData();
  const agent = buildAgentContactPrefill(agency, userName);
  const [submitting, setSubmitting] = useState(false);

  const leasingPrefill = buildLeasingCyclePrefill(property, currentLease);
  const minAvailableFrom = useMemo(() => minLeasingCycleAvailableFrom(), [open]);
  const [rentPerWeek, setRentPerWeek] = useState(leasingPrefill.rentPerWeek);
  const [availableFrom, setAvailableFrom] = useState(leasingPrefill.availableFrom);
  const [deposit, setDeposit] = useState(leasingPrefill.deposit);
  const [bond, setBond] = useState(leasingPrefill.bond);
  const [keyCustody, setKeyCustody] = useState<'crossub' | 'agent'>(leasingPrefill.keyCustody);

  const rrPrefill = buildRentReviewPrefill(property, agency, currentLease);
  const [tenantName, setTenantName] = useState(rrPrefill.tenantName);
  const [tenantId, setTenantId] = useState(rrPrefill.tenantId);
  const [leaseType, setLeaseType] = useState<'fixed' | 'periodic'>(rrPrefill.leaseType);
  const [fixedTermWeeks, setFixedTermWeeks] = useState<26 | 52>(rrPrefill.fixedTermWeeks);
  const [initialLeaseStartDate, setInitialLeaseStartDate] = useState(
    rrPrefill.initialLeaseStartDate,
  );
  const [currentWeeklyRent, setCurrentWeeklyRent] = useState(rrPrefill.currentWeeklyRent);

  const termPrefill = buildTerminationPrefill(property, currentLease);
  const [terminationType, setTerminationType] = useState<'tenant_initiated' | 'termination'>(
    'tenant_initiated',
  );
  const [expectedVacateDate, setExpectedVacateDate] = useState('');
  const [terminationGround, setTerminationGround] = useState('landlord_resides');
  const [proposedTerminationDate, setProposedTerminationDate] = useState('');
  const [bondHeld, setBondHeld] = useState(termPrefill.bondHeld);
  const [terminationNotes, setTerminationNotes] = useState('');

  const maintPrefill = buildMaintenancePrefill(property);
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [maintTenantName, setMaintTenantName] = useState(maintPrefill.tenantName);
  const [maintTenantEmail, setMaintTenantEmail] = useState(maintPrefill.tenantEmail);
  const [maintTenantPhone, setMaintTenantPhone] = useState(maintPrefill.tenantPhone);

  const inspPrefill = buildIngoingInspectionPrefill(property, currentLease, leasingCycle);
  const [moveInDate, setMoveInDate] = useState(inspPrefill.moveInDate);
  const [scheduledTime, setScheduledTime] = useState(
    inspPrefill.scheduledTime ? inspPrefill.scheduledTime.slice(0, 16) : '',
  );
  const [inspTenantName, setInspTenantName] = useState(inspPrefill.tenantName);
  const [inspTenantEmail, setInspTenantEmail] = useState(inspPrefill.tenantEmail);
  const [inspTenantPhone, setInspTenantPhone] = useState(inspPrefill.tenantPhone);
  const [accessInstructions, setAccessInstructions] = useState('');

  const titles: Record<PropertyWorkflowActionId, string> = {
    start_leasing: 'Start new leasing',
    start_rent_review: 'Start rent review',
    start_end_leasing: 'Start end leasing',
    start_maintenance: 'Log maintenance job',
    schedule_inspection: 'Schedule inspection',
    open_tribunal: 'Open tribunal case',
  };

  const handleRentChange = (value: string) => {
    setRentPerWeek(value);
    const calc = recalcLeasingDepositBond(value);
    setDeposit(calc.deposit);
    setBond(calc.bond);
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
        await createAgentLeasingCycle(propertyId, {
          agentName: agent.agentName || undefined,
          agentCompany: agent.agentCompany || undefined,
          agentEmail: agent.agentEmail || undefined,
          agentPhone: agent.agentPhone || undefined,
          keyCustody,
          rentPerWeek: rent,
          availableFrom,
          deposit: deposit ? Number(deposit) : undefined,
          bond: bond ? Number(bond) : undefined,
        });
        toast.success('Leasing cycle created');
      } else if (actionId === 'start_rent_review') {
        const rent = Number(currentWeeklyRent);
        if (!rent || rent <= 0) throw new Error('Current weekly rent is required');
        if (!tenantName.trim()) throw new Error('Tenant name is required');
        if (!initialLeaseStartDate) throw new Error('Preferred lease start date is required');
        const start = new Date(initialLeaseStartDate);
        const reviewDue = new Date(start);
        reviewDue.setFullYear(reviewDue.getFullYear() + 1);
        await createAgentRentReview(propertyId, {
          currentWeeklyRent: rent,
          tenantName: tenantName.trim(),
          rentReviewDate: reviewDue.toISOString().slice(0, 10),
          leaseType,
          fixedTermWeeks: leaseType === 'fixed' ? fixedTermWeeks : undefined,
          initialLeaseStartDate,
          tenantRef: tenantId.trim() || undefined,
          managingAgentLabel: agent.managingAgentLabel || undefined,
        });
        toast.success('Rent review created');
      } else if (actionId === 'start_end_leasing') {
        if (terminationType === 'tenant_initiated' && !expectedVacateDate) {
          throw new Error('Expected vacate date is required');
        }
        await createAgentTerminationCase(propertyId, {
          terminationType,
          expectedVacateDate: expectedVacateDate || undefined,
          terminationGround:
            terminationType === 'termination' ? terminationGround : undefined,
          proposedTerminationDate: proposedTerminationDate || undefined,
          bondHeld: bondHeld ? Number(bondHeld) : undefined,
          terminationReason: terminationNotes.trim() || undefined,
        });
        toast.success('End leasing case created');
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
            <ReadOnlyField label="Managing agent" value={agent.agentName} />
            <ReadOnlyField label="Agent email" value={agent.agentEmail} />
            <ReadOnlyField label="Agent phone" value={agent.agentPhone} />
            <ReadOnlyField label="Agency" value={agent.agentCompany} />
            <Field label="Rent / week (AUD) *">
              <Input
                type="number"
                min={1}
                value={rentPerWeek}
                onChange={(e) => handleRentChange(e.target.value)}
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
            <Field label="Deposit (auto)">
              <Input type="number" readOnly value={deposit} className="bg-muted/50" />
            </Field>
            <Field label="Bond (auto)">
              <Input type="number" readOnly value={bond} className="bg-muted/50" />
            </Field>
            <Field label="Key custody">
              <select
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                value={keyCustody}
                onChange={(e) => setKeyCustody(e.target.value as 'crossub' | 'agent')}
              >
                <option value="crossub">CROSSUB</option>
                <option value="agent">Agent</option>
              </select>
            </Field>
          </div>
        ) : null}

        {actionId === 'start_rent_review' ? (
          <div className="space-y-3">
            <ReadOnlyField label="Property" value={rrPrefill.propertyAddress} />
            <Field label="Tenant name *">
              <Input value={tenantName} onChange={(e) => setTenantName(e.target.value)} />
            </Field>
            <Field label="Tenant ID">
              <Input value={tenantId} onChange={(e) => setTenantId(e.target.value)} />
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
                  onChange={(e) => setFixedTermWeeks(Number(e.target.value) as 26 | 52)}
                >
                  <option value={26}>26 weeks</option>
                  <option value={52}>52 weeks</option>
                </select>
              </Field>
            ) : null}
            <Field label="Preferred lease start *">
              <Input
                type="date"
                value={initialLeaseStartDate}
                onChange={(e) => setInitialLeaseStartDate(e.target.value)}
              />
            </Field>
            <Field label="Current weekly rent *">
              <Input
                type="number"
                min={1}
                value={currentWeeklyRent}
                onChange={(e) => setCurrentWeeklyRent(e.target.value)}
              />
            </Field>
            <ReadOnlyField label="Managing agent" value={agent.managingAgentLabel} />
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
                    onChange={(e) => setTerminationGround(e.target.value)}
                  >
                    {TERMINATION_GROUNDS.map((g) => (
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
              </>
            )}
            <Field label="Bond held">
              <Input
                type="number"
                min={0}
                value={bondHeld}
                onChange={(e) => setBondHeld(e.target.value)}
              />
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
          <Button type="button" disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : 'Create'}
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
