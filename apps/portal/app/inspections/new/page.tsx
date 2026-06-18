'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

import { AgentShell } from '@/components/layout/agent-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { inspectionDetail, ROUTES } from '@/constants/routes';
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
import { cn } from '@/lib/utils';

type Step = 'property' | 'conductor' | 'details' | 'review';

export default function NewOpenInspectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPropertyId = searchParams.get('property');
  const { properties, addOpenInspection } = useAgentData();

  const validPreselected =
    preselectedPropertyId && properties.some((p) => p.id === preselectedPropertyId)
      ? preselectedPropertyId
      : null;

  const [step, setStep] = useState<Step>(validPreselected ? 'conductor' : 'property');
  const [propertyId, setPropertyId] = useState(validPreselected ?? '');
  const [conductedBy, setConductedBy] = useState<OpenConductedBy | null>(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [preferredNotes, setPreferredNotes] = useState('');
  const [acknowledgedResponsibility, setAcknowledgedResponsibility] = useState(false);
  const [tenantNotified, setTenantNotified] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const property = useMemo(
    () => properties.find((p) => p.id === propertyId),
    [properties, propertyId],
  );

  const listingContext = property ? getOpenListingContext(property) : null;
  const isOccupied = listingContext === 'occupied';
  const isSelf = conductedBy === 'agent';

  const scheduledAt = useMemo(() => {
    if (!scheduledDate) return undefined;
    const time = scheduledTime || '10:00';
    return new Date(`${scheduledDate}T${time}`).toISOString();
  }, [scheduledDate, scheduledTime]);

  const canProceedFromProperty = Boolean(property);
  const canProceedFromConductor = conductedBy != null;
  const canProceedFromDetails = useMemo(() => {
    if (!conductedBy) return false;
    if (conductedBy === 'crossub') return true;
    if (!acknowledgedResponsibility) return false;
    if (isOccupied && !scheduledDate) return false;
    return true;
  }, [conductedBy, acknowledgedResponsibility, isOccupied, scheduledDate]);

  const onSubmit = () => {
    if (!property || !conductedBy || !listingContext) return;
    if (isSelf && !acknowledgedResponsibility) {
      toast.error('Please acknowledge your responsibility for tenant contact');
      return;
    }
    if (isSelf && isOccupied && !scheduledDate) {
      toast.error('Please set the open inspection date and time');
      return;
    }

    setSubmitting(true);
    try {
      const inspection = addOpenInspection({
        property,
        openConductedBy: conductedBy,
        openListingContext: listingContext,
        scheduledAt,
        preferredNotes: conductedBy === 'crossub' ? preferredNotes : undefined,
        agentTenantNotifiedConfirmed: isSelf ? tenantNotified : undefined,
      });
      toast.success(
        conductedBy === 'crossub'
          ? 'Open inspection requested — CROSSUB will arrange'
          : 'Self open inspection saved',
      );
      router.push(inspectionDetail(inspection.id));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AgentShell title="Add open inspection" backHref={ROUTES.INSPECTIONS}>
      <div className="space-y-5">
        <StepIndicator current={step} />

        <p className="text-muted-foreground text-sm">
          Request an open inspection for a property. Choose whether you run it yourself or CROSSUB
          arranges it on your behalf.
        </p>

        {step === 'property' && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold">Select property</h2>
            <div className="max-h-[50vh] space-y-2 overflow-y-auto">
              {properties.map((p) => (
                <PropertyOption
                  key={p.id}
                  property={p}
                  selected={propertyId === p.id}
                  onSelect={() => {
                    setPropertyId(p.id);
                    setConductedBy(null);
                    setAcknowledgedResponsibility(false);
                    setTenantNotified(false);
                  }}
                />
              ))}
            </div>
            <Button
              className="w-full"
              disabled={!canProceedFromProperty}
              onClick={() => setStep('conductor')}
            >
              Continue
              <ChevronRight className="size-4" />
            </Button>
          </section>
        )}

        {step === 'conductor' && property && listingContext && (
          <section className="space-y-4">
            <ContextBanner property={property} context={listingContext} />

            <h2 className="text-sm font-semibold">Who conducts the open inspection?</h2>
            <div className="space-y-2">
              <ConductorOption
                id="crossub"
                selected={conductedBy === 'crossub'}
                title={OPEN_CONDUCTED_BY_LABEL.crossub}
                description="CROSSUB will arrange timing and contact the tenant or manage the listing open on your behalf."
                onSelect={() => setConductedBy('crossub')}
              />
              <ConductorOption
                id="agent"
                selected={conductedBy === 'agent'}
                title={OPEN_CONDUCTED_BY_LABEL.agent}
                description="You run the open yourself. CROSSUB will not contact the tenant or arrange times for you."
                onSelect={() => setConductedBy('agent')}
              />
            </div>

            {isSelf && (
              <div className="flex gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <p>{SELF_OPEN_INSPECTION_DISCLAIMER}</p>
              </div>
            )}

            <div className="flex gap-2">
              {!validPreselected && (
                <Button variant="outline" className="flex-1" onClick={() => setStep('property')}>
                  Back
                </Button>
              )}
              <Button
                className="flex-1"
                disabled={!canProceedFromConductor}
                onClick={() => setStep('details')}
              >
                Continue
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </section>
        )}

        {step === 'details' && property && conductedBy && listingContext && (
          <section className="space-y-4">
            {conductedBy === 'crossub' ? (
              <fieldset className="space-y-3 rounded-xl border bg-card p-4">
                <legend className="px-1 text-sm font-semibold">CROSSUB scheduling</legend>
                <p className="text-muted-foreground text-xs">
                  CROSSUB will contact the{' '}
                  {isOccupied ? 'current tenant' : 'listing contacts'} and confirm open inspection
                  times. Add any preferences below.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="preferredNotes">Preferred dates or notes (optional)</Label>
                  <textarea
                    id="preferredNotes"
                    value={preferredNotes}
                    onChange={(e) => setPreferredNotes(e.target.value)}
                    rows={3}
                    placeholder="e.g. Saturdays preferred, after 2pm…"
                    className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none dark:bg-input/30"
                  />
                </div>
              </fieldset>
            ) : (
              <>
                <div className="flex gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <p>
                    {isOccupied ? OCCUPIED_SELF_TENANT_NOTE : SELF_OPEN_NEW_LISTING_NOTE}
                  </p>
                </div>

                {isOccupied && (
                  <TenantContactCard property={property} />
                )}

                <fieldset className="space-y-3 rounded-xl border bg-card p-4">
                  <legend className="px-1 text-sm font-semibold">Your open inspection time</legend>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="scheduledDate">Date</Label>
                      <Input
                        id="scheduledDate"
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scheduledTime">Time</Label>
                      <Input
                        id="scheduledTime"
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                      />
                    </div>
                  </div>
                </fieldset>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={acknowledgedResponsibility}
                    onChange={(e) => setAcknowledgedResponsibility(e.target.checked)}
                  />
                  <span className="text-xs leading-relaxed">
                    I understand that CROSSUB is not responsible for contacting the{' '}
                    {isOccupied ? 'tenant' : 'prospects'} or arranging timing. I will handle this
                    myself.
                  </span>
                </label>

                {isOccupied && (
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={tenantNotified}
                      onChange={(e) => setTenantNotified(e.target.checked)}
                    />
                    <span className="text-xs leading-relaxed">
                      I have notified the tenant of the open inspection date and time (optional —
                      you can confirm later).
                    </span>
                  </label>
                )}
              </>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('conductor')}>
                Back
              </Button>
              <Button
                className="flex-1"
                disabled={!canProceedFromDetails}
                onClick={() => setStep('review')}
              >
                Review
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </section>
        )}

        {step === 'review' && property && conductedBy && listingContext && (
          <section className="space-y-4">
            <div className="rounded-xl border bg-card p-4 text-sm">
              <dl className="space-y-2">
                <ReviewRow label="Property" value={`${property.address}, ${property.suburb}`} />
                <ReviewRow
                  label="Context"
                  value={OPEN_LISTING_CONTEXT_LABEL[listingContext]}
                />
                <ReviewRow label="Conducted by" value={OPEN_CONDUCTED_BY_LABEL[conductedBy]} />
                {scheduledAt && (
                  <ReviewRow
                    label="Scheduled"
                    value={new Date(scheduledAt).toLocaleString()}
                  />
                )}
                {conductedBy === 'crossub' && preferredNotes.trim() && (
                  <ReviewRow label="Notes" value={preferredNotes.trim()} />
                )}
                {isSelf && tenantNotified && (
                  <ReviewRow label="Tenant notified" value="Confirmed by agent" />
                )}
              </dl>
            </div>

            {isSelf && (
              <p className="text-muted-foreground text-xs">{SELF_OPEN_INSPECTION_DISCLAIMER}</p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('details')}>
                Back
              </Button>
              <Button className="flex-1" disabled={submitting} onClick={onSubmit}>
                {submitting ? 'Saving…' : 'Submit open inspection'}
              </Button>
            </div>
          </section>
        )}
      </div>
    </AgentShell>
  );
}

function StepIndicator({ current }: { current: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: 'property', label: 'Property' },
    { id: 'conductor', label: 'Who runs it' },
    { id: 'details', label: 'Details' },
    { id: 'review', label: 'Review' },
  ];
  const currentIndex = steps.findIndex((s) => s.id === current);

  return (
    <div className="flex gap-1">
      {steps.map((s, i) => (
        <div
          key={s.id}
          className={cn(
            'h-1 flex-1 rounded-full',
            i <= currentIndex ? 'bg-primary' : 'bg-secondary',
          )}
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
          {context === 'occupied' && ` · ${property.tenantName}`}
        </p>
      </div>
      {selected && <Check className="text-primary size-4 shrink-0" />}
    </button>
  );
}

function ContextBanner({
  property,
  context,
}: {
  property: Property;
  context: ReturnType<typeof getOpenListingContext>;
}) {
  return (
    <div className="rounded-xl border bg-secondary/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Property context</p>
      <p className="mt-1 text-sm font-medium">{OPEN_LISTING_CONTEXT_LABEL[context]}</p>
      <p className="text-muted-foreground mt-1 text-xs">
        {context === 'occupied'
          ? `${property.tenantName} is the current tenant. If you run the open yourself, you must notify them of the date and time.`
          : 'This is a new or vacant listing. If you run the open yourself, you handle outreach and timing.'}
      </p>
    </div>
  );
}

function ConductorOption({
  id,
  selected,
  title,
  description,
  onSelect,
}: {
  id: string;
  selected: boolean;
  title: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-xl border p-4 text-left transition',
        selected ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'hover:bg-secondary/50',
      )}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{description}</p>
    </button>
  );
}

function TenantContactCard({ property }: { property: Property }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-2 flex items-center gap-2">
        <User className="text-primary size-4" />
        <p className="text-sm font-semibold">Tenant to notify</p>
      </div>
      <dl className="space-y-1 text-xs">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Name</dt>
          <dd className="font-medium">{property.tenantName}</dd>
        </div>
        {property.tenantContact.email && (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Email</dt>
            <dd>
              <a href={`mailto:${property.tenantContact.email}`} className="text-primary">
                {property.tenantContact.email}
              </a>
            </dd>
          </div>
        )}
        {property.tenantContact.phone && (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Phone</dt>
            <dd>
              <a href={`tel:${property.tenantContact.phone}`} className="text-primary">
                {property.tenantContact.phone}
              </a>
            </dd>
          </div>
        )}
      </dl>
      <p className="text-muted-foreground mt-3 flex items-start gap-1.5 text-[11px]">
        <Calendar className="mt-0.5 size-3 shrink-0" />
        Contact the tenant yourself before the open inspection — CROSSUB will not do this for a
        self-run open.
      </p>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
