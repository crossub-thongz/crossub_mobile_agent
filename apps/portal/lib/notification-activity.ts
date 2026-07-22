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

/** Property address as title; message body without a duplicated address prefix. */
export function agentNotificationDisplay(notification: AgentNotification): {
  title: string;
  body: string;
} {
  const rawBody = notification.body?.trim() ?? '';
  const address = notification.propertyAddress?.trim() ?? '';
  const bodyParts = rawBody ? splitBodyPrefix(rawBody) : null;

  let title = address || notification.title?.trim() || 'Notification';
  let body = rawBody;

  if (address && bodyParts && addressesMatch(bodyParts.prefix, address)) {
    body = bodyParts.detail;
  } else if (!address && bodyParts) {
    title = bodyParts.prefix;
    body = bodyParts.detail;
  }

  if (!body) {
    body =
      notification.actionRequired?.trim() ||
      notification.title?.trim() ||
      rawBody;
  }

  return { title, body };
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
