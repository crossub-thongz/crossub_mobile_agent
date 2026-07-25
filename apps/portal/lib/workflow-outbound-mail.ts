/** Matches production `MAIL_FROM` / Resend sender for workflow mail previews. */
export const WORKFLOW_OUTBOUND_FROM_EMAIL =
  process.env.NEXT_PUBLIC_MAIL_FROM_EMAIL?.trim() || "no-reply@crossub.com.au"

export function formatCrossubOutboundSender(): {
  from: string
  fromEmail: string
} {
  return {
    from: WORKFLOW_OUTBOUND_FROM_EMAIL,
    fromEmail: WORKFLOW_OUTBOUND_FROM_EMAIL,
  }
}
