import { containsHtmlMarkup } from '@/lib/workflow-email-html';

/** Structured send written by `sendAndRecordMaintenanceEmail` — email history, not timeline copy. */
export const MAINTENANCE_EMAIL_AUDIT_ACTION = 'maintenance_email_sent';

type EmailSnapshot = {
  subject: string;
  to: string;
};

function parseEmailSnapshot(message: string): EmailSnapshot | null {
  const trimmed = message.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(trimmed) as Partial<EmailSnapshot> & { body?: string };
    if (typeof parsed.subject === 'string' && typeof parsed.to === 'string') {
      return { subject: parsed.subject, to: parsed.to };
    }
  } catch {
    /* legacy prose */
  }
  return null;
}

function htmlToActivityText(value: string): string {
  if (!containsHtmlMarkup(value)) return value;
  return value
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Activity/timeline copy — never the JSON snapshot or HTML email body. */
export function formatMaintenanceAuditMessage(message: string): string {
  const snapshot = parseEmailSnapshot(message);
  if (snapshot) {
    return `Email to ${snapshot.to} · ${snapshot.subject}`;
  }

  const firstBlock = message.split(/\n\n/)[0]?.trim() ?? message;
  return htmlToActivityText(firstBlock);
}

export function isMaintenanceEmailSnapshotAudit(action: string, message: string): boolean {
  return action === MAINTENANCE_EMAIL_AUDIT_ACTION || parseEmailSnapshot(message) != null;
}
