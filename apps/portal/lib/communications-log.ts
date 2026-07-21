import type { MessageCategory, MessageThread } from '@/lib/types';

export const COMMUNICATIONS_LOG_MODULES: {
  id: MessageCategory;
  label: string;
  description: string;
}[] = [
  {
    id: 'Leasing',
    label: 'Leasing',
    description: 'Inquiries, applications, lease signing & renewals',
  },
  {
    id: 'Maintenance',
    label: 'Maintenance',
    description: 'Repair requests, contractor coordination & completion updates',
  },
  {
    id: 'Inspection',
    label: 'Inspection',
    description: 'Scheduling, reminders & post-inspection follow-ups',
  },
  {
    id: 'Accounting',
    label: 'Accounting',
    description: 'Rent reminders, arrears, invoices & receipts',
  },
];

export function threadCategory(thread: MessageThread): MessageCategory {
  const raw = thread.messageCategory ?? thread.taskType;
  if (
    raw === 'Leasing' ||
    raw === 'Maintenance' ||
    raw === 'Inspection' ||
    raw === 'Accounting' ||
    raw === 'Tribunal' ||
    raw === 'Others'
  ) {
    return raw;
  }
  const lower = raw.toLowerCase();
  if (lower.includes('leas') || lower.includes('rent review') || lower.includes('application')) {
    return 'Leasing';
  }
  if (lower.includes('maint')) return 'Maintenance';
  if (lower.includes('inspect')) return 'Inspection';
  if (lower.includes('account') || lower.includes('arrear') || lower.includes('rent')) {
    return 'Accounting';
  }
  return 'Others';
}

export function filterThreadsByModule(
  threads: MessageThread[],
  module: MessageCategory | 'all',
): MessageThread[] {
  if (module === 'all') return threads;
  return threads.filter((t) => threadCategory(t) === module);
}

export function channelLabel(channel: MessageThread['channel']): string {
  if (channel === 'mixed') return 'App & email';
  return channel === 'email' ? 'Email' : 'App';
}

export type PropertyMessageGroup = {
  propertyId: string | null;
  propertyAddress: string;
  unreadTotal: number;
  threads: MessageThread[];
};

/** Group threads by property (newest activity first within each group). */
/** Total unread messages across all threads (WeChat-style nav badge). */
export function totalUnreadMessages(threads: MessageThread[]): number {
  return threads.reduce((sum, thread) => sum + (thread.unread > 0 ? thread.unread : 0), 0);
}

/** Total unread messages across all threads for one property (WeChat-style phone book badge). */
export function unreadMessagesForProperty(
  propertyId: string,
  threads: MessageThread[],
  propertyAddress?: string,
): number {
  const normalizedAddress = propertyAddress?.trim().toLowerCase();
  return threads
    .filter((thread) => {
      if (thread.propertyId === propertyId) return true;
      if (!thread.propertyId && normalizedAddress) {
        return thread.propertyAddress.trim().toLowerCase() === normalizedAddress;
      }
      return false;
    })
    .reduce((sum, thread) => sum + (thread.unread > 0 ? thread.unread : 0), 0);
}

export function groupThreadsByProperty(threads: MessageThread[]): PropertyMessageGroup[] {
  const groups = new Map<string, PropertyMessageGroup>();
  for (const thread of threads) {
    const key = thread.propertyId ?? `__unassigned__:${thread.propertyAddress || 'none'}`;
    const existing = groups.get(key);
    if (existing) {
      existing.threads.push(thread);
      existing.unreadTotal += thread.unread > 0 ? thread.unread : 0;
      continue;
    }
    groups.set(key, {
      propertyId: thread.propertyId ?? null,
      propertyAddress: thread.propertyAddress?.trim() || 'Unassigned',
      unreadTotal: thread.unread > 0 ? thread.unread : 0,
      threads: [thread],
    });
  }

  const sorted = [...groups.values()].map((group) => ({
    ...group,
    threads: [...group.threads].sort((a, b) =>
      (b.lastAt ?? '').localeCompare(a.lastAt ?? ''),
    ),
  }));

  sorted.sort((a, b) => {
    if (b.unreadTotal !== a.unreadTotal) return b.unreadTotal - a.unreadTotal;
    const aLatest = a.threads[0]?.lastAt ?? '';
    const bLatest = b.threads[0]?.lastAt ?? '';
    return bLatest.localeCompare(aLatest);
  });

  return sorted;
}
