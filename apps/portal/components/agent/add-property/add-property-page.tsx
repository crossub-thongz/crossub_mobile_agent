'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { AddPropertyForm, ownerFromApi } from '@/components/agent/add-property/add-property-form';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ADD_PROPERTY_COPY } from '@/constants/add-property';
import { propertyDetail, propertyNew, ROUTES } from '@/constants/routes';
import {
  fetchPropertyOwners,
  fetchPropertyRecord,
} from '@/lib/crossub-api/agent-property-intake-client';
import { isPropertySelfManaged } from '@/lib/portal-service-level';
import { readRegistryDraftParties } from '@/lib/property-parties';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import {
  draftPropertyTypeChosen,
  emptyAddPropertyForm,
  hydrateAddPropertyForm,
  withOnePrimary,
  type AddPropertyFormValues,
  type AddPropertyOwner,
} from '@/utils/add-property-form';

interface LoadedDraft {
  form: AddPropertyFormValues;
  owners: AddPropertyOwner[];
  ownersSaved: boolean;
}

/**
 * Owners typed into a draft made by the earlier stepped form. They were kept in the draft's
 * notes and never put on the property, so they are shown as not saved until the agent saves.
 */
function ownersFromEarlierDraft(registryDraft: unknown): AddPropertyOwner[] {
  const parties = readRegistryDraftParties(registryDraft, 'landlords');
  return withOnePrimary(
    parties.map((party, index) => ({
      key: `earlier-${index}`,
      name: party.name,
      email: party.email ?? '',
      phone: party.phone ?? '',
      isPrimary: party.isPrimary === true,
      ownershipPercent: '',
    })),
  );
}

/** Add Property on one page (Daniel's spec v1.0): loads a draft to resume, then hands over to the form. */
export function AddPropertyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Read once: the form puts the draft's id in the address bar itself after the first save,
  // and that must not send this page back to reload the draft over what is being typed.
  const [resumePropertyId] = useState(() => searchParams.get('propertyId'));
  const { primaryAgency, agencies, apiConnected, loading, refresh } = useAgentData();
  const [draft, setDraft] = useState<LoadedDraft | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(Boolean(resumePropertyId));

  useEffect(() => {
    if (!resumePropertyId || !apiConnected) return;
    let cancelled = false;
    void (async () => {
      try {
        const [record, owners] = await Promise.all([
          fetchPropertyRecord(resumePropertyId),
          fetchPropertyOwners(resumePropertyId),
        ]);
        if (cancelled) return;
        if (record.registryIntakeComplete !== false) {
          toast.message(ADD_PROPERTY_COPY.ALREADY_REGISTERED);
          router.replace(propertyDetail(resumePropertyId));
          return;
        }
        const saved = owners.map(ownerFromApi);
        const earlier = saved.length === 0 ? ownersFromEarlierDraft(record.registryDraft) : [];
        setDraft({
          form: hydrateAddPropertyForm(
            record,
            draftPropertyTypeChosen(record.registryDraft, record.propertyType),
          ),
          owners: saved.length > 0 ? saved : earlier,
          ownersSaved: earlier.length === 0,
        });
      } catch (err) {
        if (cancelled) return;
        toast.error(apiErrorMessage(err, ADD_PROPERTY_COPY.DRAFT_LOAD_FAILED));
        router.replace(propertyNew());
      } finally {
        if (!cancelled) setLoadingDraft(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resumePropertyId, apiConnected, router]);

  const agencyReady = Boolean(primaryAgency);
  const ready = agencyReady && (!resumePropertyId || draft != null);

  return (
    <AgentShell
      title={resumePropertyId ? ADD_PROPERTY_COPY.RESUME_TITLE : ADD_PROPERTY_COPY.TITLE}
      backHref={ROUTES.PROPERTIES}
      backLabel="Properties"
      wide
    >
      {loadingDraft ? (
        <p className="text-muted-foreground text-sm">{ADD_PROPERTY_COPY.LOADING_DRAFT}</p>
      ) : !agencyReady ? (
        <p className="text-muted-foreground text-sm">
          {loading ? ADD_PROPERTY_COPY.LOADING_AGENCY : ADD_PROPERTY_COPY.NO_AGENCY}
        </p>
      ) : ready && primaryAgency ? (
        <AddPropertyForm
          agencyId={primaryAgency.id}
          selfManaged={isPropertySelfManaged(agencies, primaryAgency.id)}
          initialForm={draft?.form ?? emptyAddPropertyForm()}
          initialOwners={draft?.owners ?? []}
          initialOwnersSaved={draft?.ownersSaved ?? true}
          initialDraftId={resumePropertyId}
          onActivated={refresh}
        />
      ) : null}
    </AgentShell>
  );
}
