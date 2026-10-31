import {
  isTerminationNoticeNotification,
  terminationNoticeReasonTitle,
} from '@/lib/termination-request/display';
import type { AgentNotification } from '@/lib/types';

const HREF_TASK_LABELS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /leasing-workflow|\/leasing/i, label: 'Leasing' },
  { pattern: /maintenance/i, label: 'Maintenance' },
  { pattern: /inspection/i, label: 'Inspection' },
  { pattern: /rent-review/i, label: 'Rent review' },
  { pattern: /tenant-selection/i, label: 'Tenant selection' },
  { pattern: /vacating|end-leasing/i, label: 'End leasing' },
  { pattern: /tribunal/i, label: 'Tribunal' },
  { pattern: /accounting/i, label: 'Accounting' },
];

const TYPE_STATUS_FALLBACK: Record<AgentNotification['type'], string> = {
  approval: 'Awaiting approval',
  urgent: 'Urgent',
  update: 'In progress',
  report: 'Report ready',
  reminder: 'Action required',
};

function splitBodyPrefix(body: string): { prefix: string; detail: string } | null {
  const colonIdx = body.indexOf(':');
  if (colonIdx <= 0 || colonIdx > 96) return null;
  const prefix = body.slice(0, colonIdx).trim();
  const detail = body.slice(colonIdx + 1).trim();
  if (!prefix || !detail) return null;
  return { prefix, detail };
}

function normalizeAddressKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function addressesMatch(a: string, b: string): boolean {
  const left = normalizeAddressKey(a);
  const right = normalizeAddressKey(b);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

/** Shortest lead-in that counts as the message repeating its title, so a stray word never does. */
const TITLE_LEAD_MIN_CHARS = 12;

/**
 * A card's heading, the property it is about (null when the heading already names it) and its
 * message. The heading is the notification's own title: taking it from the message up to its
 * first colon cut times in half ("12:08") and hid what the card was for. A message that opens by
 * repeating its address or its title, then a colon, loses that lead-in.
 */
export function agentNotificationDisplay(notification: AgentNotification): {
  title: string;
  address: string | null;
  body: string;
} {
  const address = notification.propertyAddress?.trim() ?? '';
  if (isTerminationNoticeNotification(notification)) {
    return {
      title: address || 'Termination',
      address: null,
      body: terminationNoticeReasonTitle(notification),
    };
  }

  const rawBody = notification.body?.trim() ?? '';
  const title = notification.title?.trim() || address || 'Notification';
  const titleKey = normalizeAddressKey(title);
  const lead = rawBody ? splitBodyPrefix(rawBody) : null;
  const leadRepeats =
    lead != null &&
    ((address !== '' && addressesMatch(lead.prefix, address)) ||
      (lead.prefix.length >= TITLE_LEAD_MIN_CHARS && titleKey.includes(normalizeAddressKey(lead.prefix))));
  const body = (leadRepeats && lead ? lead.detail : rawBody) || notification.actionRequired?.trim() || '';
  const titleNamesAddress = address !== '' && titleKey.includes(normalizeAddressKey(address));

  return { title, address: address && !titleNamesAddress ? address : null, body };
}

function firstClause(text: string): string {
  const match = text.match(/^[^.!?]+/);
  return (match?.[0] ?? text).trim();
}

function inferTaskFromHref(href: string): string | null {
  for (const entry of HREF_TASK_LABELS) {
    if (entry.pattern.test(href)) return entry.label;
  }
  return null;
}

export type NotificationActivityFields = {
  propertyName: string;
  task: string;
  status: string;
};

/** Derive dashboard activity fields from a thin agent notification DTO. */
export function notificationActivityFields(
  notification: AgentNotification,
): NotificationActivityFields {
  const body = notification.body?.trim() ?? '';
  const bodyParts = splitBodyPrefix(body);

  const propertyFromBody = bodyParts?.prefix ?? null;
  const propertyName =
    notification.propertyAddress?.trim() ||
    propertyFromBody ||
    'Portfolio';

  let status = '';
  if (bodyParts?.detail) {
    status = firstClause(bodyParts.detail);
  } else if (notification.actionRequired?.trim()) {
    status = notification.actionRequired.trim();
  } else if (body) {
    status = firstClause(body);
  } else {
    status = TYPE_STATUS_FALLBACK[notification.type] ?? 'Updated';
  }

  const task =
    notification.title?.trim() ||
    notification.taskType?.trim() ||
    inferTaskFromHref(notification.href) ||
    'Task';

  return { propertyName, task, status };
}
