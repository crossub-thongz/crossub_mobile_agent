import { TENANT_NAME_JOIN_PATTERN } from '@/constants/property-tenancies';
import { LEASING_AGENT_DECISION } from '@/lib/leasing/constants';
import type { LeasingApplicationDetail } from '@/lib/leasing/types';
import { isSameHouseholdPerson } from '@/lib/property-parties';

export type OnboardingApplicantContact = {
  key: string;
  name: string;
  email: string;
  phone: string;
  applicationId?: string;
  contactId?: string;
  personId?: string;
  isPrimary: boolean;
};

type ApplicantSeed = {
  name: string;
  email: string;
  phone: string;
  applicationId?: string;
  contactId?: string;
  personId?: string;
  isPrimary?: boolean;
};

function clean(value?: string | null): string {
  return value?.trim() ?? '';
}

function joinedName(name: string): boolean {
  return TENANT_NAME_JOIN_PATTERN.test(name);
}

/**
 * Everyone whose contact details can be corrected on lease setup: each approved application,
 * each person named on the lease draft, and each tenant contact. Same email is one person.
 * The same display name with a different email stays a separate person.
 */
export function collectOnboardingApplicants(input: {
  applications?: readonly Pick<
    LeasingApplicationDetail,
    'id' | 'applicant' | 'email' | 'phone' | 'agentDecision'
  >[];
  jointTenants?: readonly { name?: string; email?: string; phone?: string }[];
  contacts?: readonly {
    id: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    personId?: string | null;
    isPrimary?: boolean;
  }[];
}): OnboardingApplicantContact[] {
  const people: ApplicantSeed[] = [];

  const absorb = (person: ApplicantSeed) => {
    const name = clean(person.name);
    const email = clean(person.email);
    const phone = clean(person.phone);
    if (!name && !email && !phone) return;
    const index = people.findIndex((existing) =>
      isSameHouseholdPerson({ name: existing.name, email: existing.email }, { name, email }),
    );
    if (index < 0) {
      people.push({ ...person, name, email, phone });
      return;
    }
    const current = people[index];
    if (!current) return;
    const preferIncomingName = joinedName(current.name) && Boolean(name) && !joinedName(name);
    people[index] = {
      name: preferIncomingName ? name : current.name || name,
      email: current.email || email,
      phone: current.phone || phone,
      applicationId: current.applicationId ?? person.applicationId,
      contactId: current.contactId ?? person.contactId,
      personId: current.personId ?? (clean(person.personId) || undefined),
      isPrimary: current.isPrimary || person.isPrimary,
    };
  };

  for (const app of input.applications ?? []) {
    if (app.agentDecision !== LEASING_AGENT_DECISION.APPROVED) continue;
    absorb({
      name: app.applicant,
      email: clean(app.email),
      phone: clean(app.phone),
      applicationId: app.id,
    });
  }
  for (const tenant of input.jointTenants ?? []) {
    absorb({ name: clean(tenant.name), email: clean(tenant.email), phone: clean(tenant.phone) });
  }
  for (const contact of input.contacts ?? []) {
    absorb({
      name: clean(contact.name),
      email: clean(contact.email),
      phone: clean(contact.phone),
      contactId: contact.id,
      personId: clean(contact.personId) || undefined,
      isPrimary: contact.isPrimary,
    });
  }

  const listed = people;
  const primaryMarked = listed.some((person) => person.isPrimary);

  return listed.map((person, index) => ({
    key:
      person.contactId ||
      person.personId ||
      person.applicationId ||
      person.email ||
      `${person.name}-${index}`,
    name: person.name || person.email,
    email: person.email,
    phone: person.phone,
    applicationId: person.applicationId,
    contactId: person.contactId,
    personId: person.personId,
    isPrimary: person.isPrimary || (!primaryMarked && index === 0),
  }));
}
