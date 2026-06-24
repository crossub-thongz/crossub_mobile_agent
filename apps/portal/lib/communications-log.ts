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
