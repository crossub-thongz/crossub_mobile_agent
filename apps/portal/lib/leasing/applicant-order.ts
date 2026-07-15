import type { LeasingApplicationDetail } from '@/lib/leasing/types';

const APPLICANT_ORDER_PATTERN = /^Applicant\s+(\d+)$/i;

export function isApplicantOrderLabel(name: string): boolean {
  return APPLICANT_ORDER_PATTERN.test(name.trim());
}

/** Next sequential label for a document-bundle applicant order (Applicant 1, 2, …). */
export function nextApplicantOrderLabel(applications: Pick<LeasingApplicationDetail, 'applicant'>[]): string {
  const numbers = applications
    .map((row) => {
      const match = APPLICANT_ORDER_PATTERN.exec(row.applicant.trim());
      return match ? Number(match[1]) : 0;
    })
    .filter((value) => value > 0);
  const next = numbers.length > 0 ? Math.max(...numbers) + 1 : applications.length + 1;
  return `Applicant ${next}`;
}

export function applicantOrderTitle(applicant: string): string {
  return isApplicantOrderLabel(applicant) ? `${applicant} order` : applicant;
}
