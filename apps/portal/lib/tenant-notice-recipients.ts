'use client';

import { useCallback, useEffect, useState } from 'react';

import { api } from '@/lib/api';

/** One person on the tenancy, and whether tenant notices are copied to them. */
export type TenantNoticeRecipient = {
  contactId: string | null;
  personId: string | null;
  email: string | null;
  isPrimary: boolean;
  receivesNotices: boolean;
};

/**
 * Staff route from crossub_web PR 65. Agent logins hold the permissions it requires
 * (`VIEW_ASSIGNED_CLIENTS` to read, `MODIFY_CUSTOMER_INFO` to change). The controller
 * is unversioned, so this stays on `/api/properties`, not `/api/v1/agent`.
 */
export async function listTenantNoticeRecipients(
  propertyId: string,
): Promise<TenantNoticeRecipient[]> {
  const data = await api.get<{ recipients: TenantNoticeRecipient[] }>(
    `/properties/${propertyId}/tenant-notice-recipients`,
  );
  return data.recipients;
}

export async function setTenantNoticePreference(
  propertyId: string,
  input: { receivesNotices: boolean; contactId?: string; personId?: string },
): Promise<TenantNoticeRecipient[]> {
  const data = await api.patch<{ recipients: TenantNoticeRecipient[] }>(
    `/properties/${propertyId}/tenant-notice-recipients`,
    input,
  );
  return data.recipients;
}

/** Missing from the list means on: the column defaults to true. */
export function tenantReceivesNotices(
  recipients: readonly TenantNoticeRecipient[],
  ids: { contactId?: string | null; personId?: string | null },
): boolean {
  const byContact = ids.contactId
    ? recipients.find((person) => person.contactId === ids.contactId)
    : undefined;
  if (byContact) return byContact.receivesNotices;
  const byPerson = ids.personId
    ? recipients.find((person) => person.personId === ids.personId)
    : undefined;
  if (byPerson) return byPerson.receivesNotices;
  return true;
}

/** Load who is copied on tenancy notices. `null` until the first successful read. */
export function useTenantNoticeRecipients(propertyId: string, enabled: boolean) {
  const [recipients, setRecipients] = useState<TenantNoticeRecipient[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const next = await listTenantNoticeRecipients(propertyId);
    setFailed(false);
    setRecipients(next);
    return next;
  }, [propertyId]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void listTenantNoticeRecipients(propertyId)
      .then((next) => {
        if (!active) return;
        setFailed(false);
        setRecipients(next);
      })
      .catch(() => {
        if (!active) return;
        setFailed(true);
        setRecipients(null);
      });
    return () => {
      active = false;
    };
  }, [enabled, propertyId]);

  const setPreference = useCallback(
    async (input: { receivesNotices: boolean; contactId?: string; personId?: string }) => {
      setBusy(true);
      try {
        setRecipients(await setTenantNoticePreference(propertyId, input));
      } finally {
        setBusy(false);
      }
    },
    [propertyId],
  );

  return { recipients, failed, busy, reload, setPreference };
}
