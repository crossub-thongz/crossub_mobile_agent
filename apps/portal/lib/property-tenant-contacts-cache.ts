import type { AgentPropertyContact } from '@/lib/crossub-api/agent-client';

export const tenantContactsCache = new Map<string, AgentPropertyContact[]>();
export const tenantContactsInflight = new Set<string>();
export const tenantContactsListeners = new Set<() => void>();

export function notifyTenantContactsListeners() {
  for (const listener of tenantContactsListeners) listener();
}

/** Drop cached tenant names so the property list reads them again after a property change. */
export function invalidatePropertyTenantContacts(propertyId?: string) {
  if (propertyId) {
    tenantContactsCache.delete(propertyId);
    tenantContactsInflight.delete(propertyId);
  } else {
    tenantContactsCache.clear();
    tenantContactsInflight.clear();
  }
  notifyTenantContactsListeners();
}
