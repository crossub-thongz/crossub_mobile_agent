import type { NotificationPrefs } from '@/lib/store';
import type { AgentNotification } from '@/lib/types';

export function notificationMatchesPrefs(
  notification: AgentNotification,
  prefs: NotificationPrefs,
): boolean {
  if (notification.type === 'approval') return prefs.approvals;
  if (notification.type === 'urgent') return prefs.urgent;
  return prefs.updates;
}
