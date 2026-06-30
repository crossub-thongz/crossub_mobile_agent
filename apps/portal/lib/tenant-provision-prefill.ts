import { getLeasingApplicants } from '@/lib/leasing-applicants';
import type { TenantSelectionCase } from '@/lib/types';

export interface TenantProvisionPrefill {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  /** When set, email is treated as sourced from an application and shown read-only. */
  applicationLabel?: string;
}

export function splitApplicantName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: '' };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(' ') };
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function emailFromSelection(selection: TenantSelectionCase): string {
  return `${slugify(selection.applicantName)}@email.com`;
}

export function prefillFromTenantSelection(
  selection: TenantSelectionCase,
): TenantProvisionPrefill {
  const { firstName, lastName } = splitApplicantName(selection.applicantName);
  return {
    email: emailFromSelection(selection),
    firstName,
    lastName,
    phone: '',
    applicationLabel: selection.applicantName,
  };
}

export function resolveTenantProvisionPrefill(input: {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  selectionId?: string | null;
  propertyId?: string | null;
  applicantId?: string | null;
  tenantSelections: TenantSelectionCase[];
}): TenantProvisionPrefill {
  const directEmail = input.email?.trim() ?? '';
  if (directEmail) {
    return {
      email: directEmail,
      firstName: input.firstName?.trim() ?? '',
      lastName: input.lastName?.trim() ?? '',
      phone: input.phone?.trim() ?? '',
      applicationLabel: directEmail,
    };
  }

  if (input.selectionId) {
    const selection = input.tenantSelections.find((s) => s.id === input.selectionId);
    if (selection) return prefillFromTenantSelection(selection);
  }

  if (input.propertyId && input.applicantId) {
    const selection = input.selectionId
      ? input.tenantSelections.find((s) => s.id === input.selectionId)
      : input.tenantSelections.find((s) => s.propertyId === input.propertyId);
    const applicants = getLeasingApplicants({
      propertyId: input.propertyId,
      selection,
    });
    const applicant = applicants.find((a) => a.id === input.applicantId);
    if (applicant) {
      const { firstName, lastName } = splitApplicantName(applicant.name);
      return {
        email: applicant.email,
        firstName,
        lastName,
        phone: '',
        applicationLabel: applicant.name,
      };
    }
  }

  return { email: '', firstName: '', lastName: '', phone: '' };
}
