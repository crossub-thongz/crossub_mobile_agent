import type { AgentNotification } from '@/lib/types';

export function isAgentPaymentNotification(
  notification: Pick<AgentNotification, 'title' | 'actionRequired'>,
): boolean {
  const title = notification.title?.trim().toLowerCase() ?? '';
  const action = notification.actionRequired?.trim().toLowerCase() ?? '';
  return title.startsWith('payment required') || action === 'pay platform fee';
}
