'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Mail, Pencil, Phone } from 'lucide-react';
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
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  REGISTRY_NAME_SKIP_NOTE,
  TENANT_DETAILS_COPY as COPY,
  TENANT_RECORD_LAYER_LABEL,
} from '@/constants/property-tenancies';
import { listPropertyContacts, patchAgentProperty, updatePropertyContact } from '@/lib/crossub-api/agent-client';
import {
  fetchPropertyTenancyOverview,
  updateTenantDetails,
} from '@/lib/crossub-api/agent-tenancy-client';
import { updateSelfManagedContract } from '@/lib/crossub-api/agent-workflow-client';
import { leasingOpsApi } from '@/lib/leasing-ops-api';
import {
  collectOnboardingApplicants,
  type OnboardingApplicantContact,
} from '@/lib/leasing/onboarding-applicants';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';
import { splitApplicantName } from '@/lib/tenant-provision-prefill';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

type LoadedContact = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  personId?: string | null;
  isPrimary?: boolean;
};

/**
 * Lease setup lists every applicant and edits that person's name, email and phone.
 * A joint application is not collapsed into the first person.
 */
export function LeasingApplicantContacts({ detail }: { detail: LeasingPropertyDetail }) {
  const { leasingCycles, apiConnected } = useAgentData();
  const applyCycleView = useLeasingWorkflowStore((s) => s.applyCycleView);
  const [contacts, setContacts] = useState<LoadedContact[]>([]);
  const [reloadToken, setReloadToken] = useState(0);
  const [editing, setEditing] = useState<OnboardingApplicantContact | null>(null);

  const cycleId = detail.cycleId ?? leasingCycles.find((cycle) => cycle.propertyId === detail.propertyId)?.id;

  useEffect(() => {
    let active = true;
    const apply = (rows: LoadedContact[]) => {
      if (active) setContacts(rows);
    };
    void fetchPropertyTenancyOverview(detail.propertyId)
      .then((overview) => {
        apply(
          (overview.contacts ?? [])
            .filter((contact) => contact.role === 'TENANT')
            .map((contact) => ({
              id: contact.id,
              name: contact.name,
              email: contact.email,
              phone: contact.mobile,
              personId: contact.personId,
              isPrimary: contact.isPrimary,
            })),
        );
      })
      .catch(() => {
        void listPropertyContacts(detail.propertyId)
          .then((rows) => {
            apply(
              rows
                .filter((contact) => contact.role === 'TENANT')
                .map((contact) => ({
                  id: contact.id,
                  name: contact.name,
                  email: contact.email,
                  phone: contact.phone,
                  isPrimary: contact.isPrimary,
                })),
            );
          })
          .catch(() => apply([]));
      });
    return () => {
      active = false;
    };
  }, [detail.propertyId, reloadToken]);

  const applicants = useMemo(
    () =>
      collectOnboardingApplicants({
        applications: detail.applicationsDetail,
        jointTenants: detail.onboarding.agreement.contract.jointTenants,
        contacts,
      }),
    [contacts, detail.applicationsDetail, detail.onboarding.agreement.contract.jointTenants],
  );

  const save = async (person: OnboardingApplicantContact, firstName: string, lastName: string, email: string, phone: string) => {
    const name = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
    const nextEmail = email.trim();
    const nextPhone = phone.trim();
    if (!name && !nextEmail && !nextPhone) {
      toast.error(COPY.FAILED);
      return false;
    }

    let announced = false;
    if (person.personId) {
      const result = await updateTenantDetails(detail.propertyId, person.personId, {
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        email: nextEmail || null,
        phone: nextPhone || null,
      });
      const touched = result.updated.map((layer) => TENANT_RECORD_LAYER_LABEL[layer] ?? layer);
      toast.success(touched.length > 0 ? `${COPY.DONE}: ${touched.join(', ')}` : COPY.NOTHING);
      const note = result.registrySkipped ? REGISTRY_NAME_SKIP_NOTE[result.registrySkipped] : '';
      if (note) toast.warning(note);
      announced = true;
    } else if (person.contactId) {
      await updatePropertyContact(detail.propertyId, person.contactId, {
        name: name || null,
        email: nextEmail || null,
        phone: nextPhone || null,
      });
      toast.success(COPY.DONE);
      announced = true;
    }

    if (!person.personId && person.isPrimary) {
      await patchAgentProperty(detail.propertyId, {
        ...(name ? { tenantName: name } : {}),
        ...(nextEmail ? { tenantEmail: nextEmail } : {}),
        ...(nextPhone ? { tenantPhone: nextPhone } : {}),
      });
      if (!announced) {
        toast.success(COPY.DONE);
        announced = true;
      }
    }

    const jointTenants = applicants.map((applicant) =>
      applicant.key === person.key
        ? { name: name || applicant.name, email: nextEmail || undefined, phone: nextPhone || undefined }
        : { name: applicant.name, email: applicant.email || undefined, phone: applicant.phone || undefined },
    );
    if (apiConnected && cycleId) {
      try {
        await updateSelfManagedContract(detail.propertyId, cycleId, { jointTenants });
        applyCycleView(detail.propertyId, await leasingOpsApi.get(cycleId));
        if (!announced) toast.success(COPY.DONE);
        announced = true;
      } catch (err) {
        if (!announced) throw err;
        toast.warning(apiErrorMessage(err, 'Contact saved. The lease draft could not be updated.'));
      }
    } else if (!announced) {
      toast.error(COPY.FAILED);
      return false;
    }

    setReloadToken((token) => token + 1);
    return true;
  };

  if (applicants.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
        {applicants.length > 1 ? `Applicants (${applicants.length})` : 'Confirmed tenant'}
      </p>
      <ul className="space-y-3">
        {applicants.map((applicant) => (
          <li key={applicant.key} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{applicant.name}</p>
              <div className="text-muted-foreground mt-1 space-y-1 text-[12.5px]">
                {applicant.email ? (
                  <p className="flex items-center gap-1.5">
                    <Mail className="size-3.5 shrink-0" />
                    <span className="truncate">{applicant.email}</span>
                  </p>
                ) : null}
                {applicant.phone ? (
                  <p className="flex items-center gap-1.5">
                    <Phone className="size-3.5 shrink-0" />
                    <span>{applicant.phone}</span>
                  </p>
                ) : null}
              </div>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="shrink-0"
              aria-label={`Edit ${applicant.name}`}
              onClick={() => setEditing(applicant)}
            >
              <Pencil className="size-3.5" />
            </Button>
          </li>
        ))}
      </ul>
      <ApplicantContactDialog
        person={editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSave={save}
      />
    </div>
  );
}

function ApplicantContactDialog({
  person,
  onOpenChange,
  onSave,
}: {
  person: OnboardingApplicantContact | null;
  onOpenChange: (open: boolean) => void;
  onSave: (
    person: OnboardingApplicantContact,
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
  ) => Promise<boolean>;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!person) return;
    const parts = splitApplicantName(person.name);
    setFirstName(parts.firstName);
    setLastName(parts.lastName);
    setEmail(person.email);
    setPhone(person.phone);
  }, [person]);

  const submit = async () => {
    if (!person) return;
    setSaving(true);
    try {
      const ok = await onSave(person, firstName, lastName, email, phone);
      if (ok) onOpenChange(false);
    } catch (err) {
      toast.error(apiErrorMessage(err, COPY.FAILED));
    } finally {
      setSaving(false);
    }
  };

  const field = (id: string, label: string, value: string, set: (value: string) => void, type = 'text') => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(event) => set(event.target.value)} />
    </div>
  );

  return (
    <Dialog open={person != null} onOpenChange={(next) => (saving ? undefined : onOpenChange(next))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{COPY.TITLE}</DialogTitle>
          <DialogDescription>
            {person && person.name ? `${person.name}. ${COPY.DESCRIPTION}` : COPY.DESCRIPTION}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="grid grid-cols-2 gap-2">
            {field('applicant-first-name', COPY.FIRST_NAME, firstName, setFirstName)}
            {field('applicant-last-name', COPY.LAST_NAME, lastName, setLastName)}
          </div>
          {field('applicant-email', COPY.EMAIL, email, setEmail, 'email')}
          {field('applicant-phone', COPY.PHONE, phone, setPhone, 'tel')}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            {COPY.CANCEL}
          </Button>
          <Button type="button" disabled={saving} onClick={() => void submit()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {COPY.SAVE}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
