import type { TenantSelectionCase } from '@/lib/types';

export type LeasingApplicationDocument = {
  id: string;
  name: string;
  downloadUrl: string;
};

export type LeasingApplication = {
  id: string;
  name: string;
  email: string;
  income: string;
  score: string;
  submittedAt?: string;
  documents: LeasingApplicationDocument[];
};

const DEFAULT_APPLICANTS: LeasingApplication[] = [
  {
    id: 'a1',
    name: 'Priya Nair',
    email: 'priya.nair@email.com',
    income: '$92,000',
    score: 'Excellent',
    submittedAt: '2026-05-22T14:30:00',
    documents: [
      { id: 'a1-app', name: 'Application form.pdf', downloadUrl: '#application-form-a1' },
      { id: 'a1-id', name: 'ID verification.pdf', downloadUrl: '#id-verification-a1' },
      { id: 'a1-ref', name: 'References.pdf', downloadUrl: '#references-a1' },
    ],
  },
  {
    id: 'a2',
    name: 'Marcus Lee',
    email: 'marcus.lee@email.com',
    income: '$78,500',
    score: 'Good',
    submittedAt: '2026-05-23T09:15:00',
    documents: [
      { id: 'a2-app', name: 'Application form.pdf', downloadUrl: '#application-form-a2' },
      { id: 'a2-id', name: 'ID verification.pdf', downloadUrl: '#id-verification-a2' },
      { id: 'a2-pay', name: 'Payslips.pdf', downloadUrl: '#payslips-a2' },
    ],
  },
  {
    id: 'a3',
    name: 'Emma Walsh',
    email: 'emma.w@email.com',
    income: '$85,200',
    score: 'Good',
    submittedAt: '2026-05-24T11:00:00',
    documents: [
      { id: 'a3-app', name: 'Application form.pdf', downloadUrl: '#application-form-a3' },
      { id: 'a3-id', name: 'ID verification.pdf', downloadUrl: '#id-verification-a3' },
      { id: 'a3-lease', name: 'Rental history.pdf', downloadUrl: '#rental-history-a3' },
    ],
  },
  {
    id: 'a4',
    name: 'Daniel Kerr',
    email: 'daniel.kerr@email.com',
    income: '$74,000',
    score: 'Fair',
    submittedAt: '2026-05-25T08:05:00',
    documents: [
      { id: 'a4-app', name: 'Application form.pdf', downloadUrl: '#application-form-a4' },
      { id: 'a4-id', name: 'ID verification.pdf', downloadUrl: '#id-verification-a4' },
    ],
  },
  {
    id: 'a5',
    name: 'Alex Rivera',
    email: 'alex.rivera@email.com',
    income: '$88,000',
    score: 'Good',
    submittedAt: '2026-05-24T16:20:00',
    documents: [
      { id: 'a5-app', name: 'Application form.pdf', downloadUrl: '#application-form-a5' },
      { id: 'a5-id', name: 'ID verification.pdf', downloadUrl: '#id-verification-a5' },
      { id: 'a5-ref', name: 'References.pdf', downloadUrl: '#references-a5' },
    ],
  },
  {
    id: 'a6',
    name: 'Sofia Martinez',
    email: 'sofia.m@email.com',
    income: '$81,300',
    score: 'Good',
    submittedAt: '2026-05-25T10:40:00',
    documents: [
      { id: 'a6-app', name: 'Application form.pdf', downloadUrl: '#application-form-a6' },
      { id: 'a6-id', name: 'ID verification.pdf', downloadUrl: '#id-verification-a6' },
    ],
  },
];

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function applicantFromSelection(selection: TenantSelectionCase): LeasingApplication {
  return {
    id: selection.id,
    name: selection.applicantName,
    email: `${slugify(selection.applicantName)}@email.com`,
    income: '—',
    score: selection.status,
    submittedAt: selection.timeline[0]?.at,
    documents: selection.documents.map((name, i) => ({
      id: `${selection.id}-doc-${i}`,
      name,
      downloadUrl: `#${slugify(name)}-${selection.id}`,
    })),
  };
}

export function getLeasingApplicants(input: {
  propertyId: string;
  applicationCount?: number;
  selection?: TenantSelectionCase;
}): LeasingApplication[] {
  const pool =
    input.propertyId === 'prop-3'
      ? DEFAULT_APPLICANTS.filter((a) => a.id === 'a5' || a.id === 'a2' || a.id === 'a3')
      : DEFAULT_APPLICANTS;

  let applicants = [...pool];

  if (input.selection) {
    const primary = applicantFromSelection(input.selection);
    applicants = [primary, ...applicants.filter((a) => a.name !== primary.name)];
  }

  const limit = input.applicationCount ?? applicants.length;
  return applicants.slice(0, Math.max(limit, 1));
}
