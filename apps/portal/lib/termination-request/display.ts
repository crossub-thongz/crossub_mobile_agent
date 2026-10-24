import { findPropertyForAddress } from '@/lib/property-address';
import { NSW_TERMINATION_REASONS } from '@/lib/termination-request/constants';
import type { AgentNotification, Property } from '@/lib/types';

const MONEY_OR_QUANTITY =
  /(?:A\$|\$)\s?\d[\d,]*(?:\.\d+)?|\b\d+(?:\.\d+)?\s?(?:weeks?|days?|months?)\b/gi;

const PROPERTY_PATH = /\/properties\/([^/?#]+)/i;

/** Sent-notice copy the agent is allowed to see: the reason title, never an amount. */
export function isTerminationNoticeNotification(
  notification: Pick<AgentNotification, 'href' | 'title' | 'taskType'>,
): boolean {
  const href = notification.href.toLowerCase();
  if (href.includes('termination-request') || href.includes('termination-notice')) return true;
  const title = notification.title.trim().toLowerCase();
  if (
    title === 'termination' ||
    title.startsWith('termination notice') ||
    title.startsWith('termination sent')
  ) {
    return true;
  }
  const task = notification.taskType.trim().toLowerCase();
  return task === 'termination' || task === 'termination notice';
}

export function terminationNoticeReasonTitle(
  notification: Pick<AgentNotification, 'title' | 'body' | 'actionRequired'>,
): string {
  const source = [notification.title, notification.body, notification.actionRequired]
    .filter((part): part is string => Boolean(part?.trim()))
    .join('\n');
  const lower = source.toLowerCase();
  const byLength = [...NSW_TERMINATION_REASONS].sort((a, b) => b.label.length - a.label.length);
  for (const reason of byLength) {
    if (lower.includes(reason.label.toLowerCase())) return reason.label;
  }
  for (const reason of NSW_TERMINATION_REASONS) {
    if (source.includes(reason.code)) return reason.label;
  }

  const first = (notification.body ?? '')
    .replace(MONEY_OR_QUANTITY, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/[.\n]/)[0]
    ?.replace(/^[\s,.:;\-–—]+|[\s,.:;\-–—]+$/g, '')
    .trim();
  if (first && first.length <= 60 && !/\d/.test(first) && !first.includes('$')) return first;
  return 'Termination';
}

function propertyIdFromHref(href: string): string | undefined {
  const pathMatch = href.match(PROPERTY_PATH);
  if (pathMatch?.[1]) {
    try {
      return decodeURIComponent(pathMatch[1]);
    } catch {
      return pathMatch[1];
    }
  }
  const query = href.split('?')[1];
  if (!query) return undefined;
  const propertyId = new URLSearchParams(query).get('propertyId')?.trim();
  return propertyId || undefined;
}

/**
 * Termination notices are limited to properties already on this agent's book.
 * Other notification types are unchanged. An empty book (still loading) does
 * not hide rows.
 */
export function terminationNoticeVisibleToAgent(
  notification: AgentNotification,
  properties: Property[],
): boolean {
  if (!isTerminationNoticeNotification(notification)) return true;
  if (properties.length === 0) return true;

  const propertyId = propertyIdFromHref(notification.href);
  if (propertyId) return properties.some((property) => property.id === propertyId);

  const address = notification.propertyAddress?.trim();
  if (!address || address === '—') return true;
  return Boolean(findPropertyForAddress(properties, null, address));
}
