'use client';

import { useMemo } from 'react';

import { WorkflowEmailSignatureBlock } from '@/components/agent/workflow-email-signature-block';
import type { JobCaseEmailRecord } from '@/lib/job-case-email';
import {
  buildJobCaseSentEmailPreview,
  defaultJobCaseEmailLogoUrl,
} from '@/lib/job-case-sent-email-preview';
import type { WorkflowEmailContact } from '@/lib/job-case-email-recipients';
import { cn } from '@/lib/utils';

/** Renders sent workflow mail the same way Resend delivers it (HTML body + logo signature). */
export function JobCaseEmailBodyPreview({
  email,
  contacts = [],
  className,
  logoUrl,
}: {
  email: JobCaseEmailRecord;
  contacts?: WorkflowEmailContact[];
  className?: string;
  logoUrl?: string;
}) {
  const resolvedLogoUrl = logoUrl ?? defaultJobCaseEmailLogoUrl();
  const preview = useMemo(
    () => buildJobCaseSentEmailPreview(email, contacts, resolvedLogoUrl),
    [email, contacts, resolvedLogoUrl],
  );

  return (
    <div className={cn('rounded-xl border bg-muted/20 p-3', className)}>
      <div
        className={cn(
          'text-sm leading-relaxed text-foreground/90',
          '[&_a:not(.crossub-email-cta)]:text-primary [&_a:not(.crossub-email-cta)]:underline',
          '[&_a.crossub-email-cta]:inline-block [&_a.crossub-email-cta]:rounded-lg [&_a.crossub-email-cta]:bg-emerald-500 [&_a.crossub-email-cta]:px-5 [&_a.crossub-email-cta]:py-3 [&_a.crossub-email-cta]:font-semibold [&_a.crossub-email-cta]:text-white [&_a.crossub-email-cta]:no-underline',
          '[&_p]:my-2 [&_p]:last:mb-0',
        )}
        dangerouslySetInnerHTML={{ __html: preview.bodyHtml }}
      />
      {preview.showSignature ? <WorkflowEmailSignatureBlock logoUrl={resolvedLogoUrl} /> : null}
    </div>
  );
}
