import type { JobCaseEmailRecord } from "@/lib/job-case-email"
import {
  resolveJobCaseRecipientRoleForPreview,
  type WorkflowEmailContact,
} from "@/lib/job-case-email-recipients"
import { prepareWorkflowEmailBodyForPreview } from "@/lib/workflow-email-portal"
import { mixedTextToEmailHtml } from '@/lib/workflow-email-html';
import {
  appendCrossubEmailSignature,
  emailBodyHasCrossubSignature,
} from "@/lib/workflow-email-delivery-preview"

function isFullHtmlDocument(html: string): boolean {
  const trimmed = html.trim()
  return /<!DOCTYPE\s+html/i.test(trimmed) || /<html[\s>]/i.test(trimmed)
}

/** Mirror API `buildGenericEmailBodies` for plain-text workflow mail shown in history previews. */
export function buildJobCaseSentEmailBodyHtml(
  bodyText: string,
  recipientRole?: string,
  logoUrl?: string,
): string {
  const trimmed = bodyText.trim()
  if (!trimmed) return ""

  if (isFullHtmlDocument(trimmed)) {
    return trimmed
  }

  const prepared = prepareWorkflowEmailBodyForPreview(trimmed, recipientRole, {})
  return mixedTextToEmailHtml(prepared)
}

export function buildJobCaseSentEmailPreview(
  email: JobCaseEmailRecord,
  contacts: WorkflowEmailContact[] = [],
  logoUrl?: string,
): { bodyHtml: string; showSignature: boolean } {
  const recipientRole = resolveJobCaseRecipientRoleForPreview(email, contacts)
  const bodyHtml = buildJobCaseSentEmailBodyHtml(email.body, recipientRole, logoUrl)
  const showSignature =
    !emailBodyHasCrossubSignature(email.body) && !emailBodyHasCrossubSignature(bodyHtml)

  return { bodyHtml, showSignature }
}

/** Plain-text part incl. signature — matches the text/plain MIME Resend sends. */
export function buildJobCaseSentEmailPlainText(
  bodyText: string,
  recipientRole?: string,
  logoUrl?: string,
): string {
  const html = buildJobCaseSentEmailBodyHtml(bodyText, recipientRole, logoUrl)
  const signed = appendCrossubEmailSignature(html, bodyText.trim(), logoUrl ?? defaultJobCaseEmailLogoUrl())
  return signed.text
}

export function defaultJobCaseEmailLogoUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/crossub-logo.png`
  }
  return "/crossub-logo.png"
}
