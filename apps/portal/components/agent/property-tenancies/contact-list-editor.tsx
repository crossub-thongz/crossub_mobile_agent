'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PROPERTY_CONTACT_ROLE } from '@/constants/property-contact';
import {
  CONTACT_EDITOR_COPY as COPY,
  CONTACT_REMOVE_CONFIRM,
  MAX_TENANT_CONTACTS,
  TENANT_INVITE_STATUS_SENT,
} from '@/constants/property-tenancies';
import {
  addPropertyContact,
  removePropertyContact,
  updatePropertyContact,
} from '@/lib/crossub-api/agent-client';
import {
  setPrimaryPropertyContact,
  type PropertyTenancyContact,
} from '@/lib/crossub-api/agent-tenancy-client';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

import { PrimaryTag } from './tenancy-ui';

type ContactRole = keyof typeof CONTACT_REMOVE_CONFIRM;
type Draft = { id: string | null; name: string; email: string; phone: string };

const EMPTY_DRAFT: Draft = { id: null, name: '', email: '', phone: '' };

function draftOf(contact: PropertyTenancyContact): Draft {
  return {
    id: contact.id,
    name: contact.name ?? '',
    email: contact.email ?? '',
    phone: contact.mobile ?? '',
  };
}

/**
 * The live tenant or owner contacts on a property: add, correct, make primary and remove, through
 * the agent contact routes. The list re-reads from `contacts` once the caller reloads.
 */
export function ContactListEditor({
  propertyId,
  role,
  contacts,
  emptyLabel,
  addLabel,
  onChanged,
}: {
  propertyId: string;
  role: ContactRole;
  contacts: readonly PropertyTenancyContact[];
  /** Shown when there are no contacts; blank shows nothing. */
  emptyLabel: string;
  addLabel: string;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const atLimit = role === PROPERTY_CONTACT_ROLE.TENANT && contacts.length >= MAX_TENANT_CONTACTS;

  const run = async (action: () => Promise<string>) => {
    setBusy(true);
    try {
      toast.success(await action());
      onChanged();
    } catch (err) {
      toast.error(apiErrorMessage(err, COPY.FAILED));
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = () => {
    if (!draft) return;
    const name = draft.name.trim();
    const email = draft.email.trim();
    const phone = draft.phone.trim();
    if (!name && !email && !phone) {
      toast.error(COPY.REQUIRED);
      return;
    }
    void run(async () => {
      if (draft.id) {
        await updatePropertyContact(propertyId, draft.id, {
          name: name || null,
          email: email || null,
          phone: phone || null,
        });
        setDraft(null);
        return COPY.SAVED;
      }
      const result = await addPropertyContact(propertyId, {
        role,
        name: name || undefined,
        email: email || undefined,
        phone: phone || undefined,
      });
      setDraft(null);
      const invite = result.tenantPortalInvite;
      return invite?.status === TENANT_INVITE_STATUS_SENT
        ? `${COPY.ADDED}. ${COPY.INVITE_SENT} ${invite.email}`
        : COPY.ADDED;
    });
  };

  const remove = (contact: PropertyTenancyContact) =>
    void run(async () => {
      await removePropertyContact(propertyId, contact.id);
      setConfirmRemoveId(null);
      return COPY.REMOVED;
    });

  const makePrimary = (contact: PropertyTenancyContact) =>
    void run(async () => {
      await setPrimaryPropertyContact(propertyId, contact.id);
      return COPY.PRIMARY_SET;
    });

  const draftForm = draft ? (
    <div className="space-y-2 rounded-lg border p-3">
      <Input
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        placeholder={COPY.NAME}
        aria-label={COPY.NAME}
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          type="email"
          value={draft.email}
          onChange={(e) => setDraft({ ...draft, email: e.target.value })}
          placeholder={COPY.EMAIL}
          aria-label={COPY.EMAIL}
        />
        <Input
          type="tel"
          value={draft.phone}
          onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
          placeholder={COPY.PHONE}
          aria-label={COPY.PHONE}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setDraft(null)}>
          {COPY.CANCEL}
        </Button>
        <Button type="button" size="sm" disabled={busy} onClick={saveDraft}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
          {draft.id ? COPY.SAVE : COPY.ADD}
        </Button>
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-2">
      {contacts.length === 0 ? (
        emptyLabel ? (
          <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-3 text-center text-xs">
            {emptyLabel}
          </p>
        ) : null
      ) : (
        <ul className="divide-y rounded-lg border">
          {contacts.map((contact) =>
            draft?.id === contact.id ? (
              <li key={contact.id} className="p-2">
                {draftForm}
              </li>
            ) : (
              <li key={contact.id} className="space-y-1.5 px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {contact.name || contact.email || contact.mobile}
                      {contact.isPrimary ? <PrimaryTag label={COPY.PRIMARY} /> : null}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {[contact.email, contact.mobile].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-x-3 gap-y-1 text-xs font-semibold">
                    <button type="button" className="text-primary" disabled={busy} onClick={() => setDraft(draftOf(contact))}>
                      {COPY.EDIT}
                    </button>
                    {!contact.isPrimary ? (
                      <button type="button" className="text-primary" disabled={busy} onClick={() => makePrimary(contact)}>
                        {COPY.MAKE_PRIMARY}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="text-destructive"
                      disabled={busy}
                      onClick={() => setConfirmRemoveId(contact.id)}
                    >
                      {COPY.REMOVE}
                    </button>
                  </div>
                </div>
                {confirmRemoveId === contact.id ? (
                  <div className="bg-muted/40 flex flex-wrap items-center justify-between gap-2 rounded-md px-2.5 py-2">
                    <p className="text-muted-foreground text-xs">{CONTACT_REMOVE_CONFIRM[role]}</p>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setConfirmRemoveId(null)}>
                        {COPY.CANCEL}
                      </Button>
                      <Button type="button" variant="destructive" size="sm" disabled={busy} onClick={() => remove(contact)}>
                        {COPY.CONFIRM_REMOVE}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            ),
          )}
        </ul>
      )}
      {draft && !draft.id ? draftForm : null}
      {!draft ? (
        <>
          {atLimit ? <p className="text-muted-foreground text-xs">{COPY.LIMIT}</p> : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={busy || atLimit}
            onClick={() => setDraft(EMPTY_DRAFT)}
          >
            <Plus className="size-3.5" />
            {addLabel}
          </Button>
        </>
      ) : null}
    </div>
  );
}
