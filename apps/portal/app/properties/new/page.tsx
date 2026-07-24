'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import {
  NewPropertyRegistryForm,
  type NewPropertyRegistryValues,
} from '@/components/agent/new-property-registry-form';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { propertyDetail, propertyNew, ROUTES } from '@/constants/routes';
import { fetchProperty } from '@/lib/crossub-api/agent-client';
import { mapAgentProperty } from '@/lib/crossub-api/agent-mappers';
import {
  hydrateRegistryFormFromProperty,
  type PropertyRegistryAutosaveState,
} from '@/lib/property-registry-persist';

export default function AddPropertyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumePropertyId = searchParams.get('propertyId');
  const {
    primaryAgency,
    apiConnected,
    savePropertyRegistryDraft,
    agentPortfolioId,
  } = useAgentData();
  const [draftPropertyId, setDraftPropertyId] = useState<string | null>(resumePropertyId);
  const [initialState, setInitialState] = useState<PropertyRegistryAutosaveState | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(Boolean(resumePropertyId && apiConnected));
  const [submitting, setSubmitting] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (!resumePropertyId || !apiConnected) {
      setLoadingDraft(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const dto = await fetchProperty(resumePropertyId);
        const property = mapAgentProperty(dto, agentPortfolioId);
        const registryDraft = (dto as { registryDraft?: unknown }).registryDraft;
        const intakeComplete = (dto as { registryIntakeComplete?: boolean }).registryIntakeComplete;

        if (intakeComplete !== false) {
          if (!cancelled) {
            toast.message('This property is already registered');
            router.replace(propertyDetail(resumePropertyId));
          }
          return;
        }

        if (!cancelled) {
          setInitialState(
            hydrateRegistryFormFromProperty(property, registryDraft, {
              agencyName: primaryAgency?.name ?? '',
              agencyCompany: primaryAgency?.company,
            }),
          );
          setDraftPropertyId(resumePropertyId);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Could not load property draft');
          router.replace(propertyNew());
        }
      } finally {
        if (!cancelled) setLoadingDraft(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resumePropertyId, apiConnected, agentPortfolioId, primaryAgency, router]);

  const handleAutosave = useCallback(
    async (state: PropertyRegistryAutosaveState) => {
      if (!apiConnected) return;
      setAutosaveStatus('saving');
      try {
        const property = await savePropertyRegistryDraft(draftPropertyId, state, {
          complete: false,
        });
        setDraftPropertyId(property.id);
        setAutosaveStatus('saved');
      } catch (err) {
        setAutosaveStatus('error');
        toast.error(err instanceof Error ? err.message : 'Could not save draft');
      }
    },
    [apiConnected, draftPropertyId, resumePropertyId, router, savePropertyRegistryDraft],
  );

  const onSubmitNewProperty = async (
    values: NewPropertyRegistryValues,
  ): Promise<{ propertyId: string }> => {
    const address = values.address.trim();
    if (!address) {
      toast.error('Street address is required');
      throw new Error('Street address is required');
    }
    if (!values.state) {
      toast.error('Select the property state or territory');
      throw new Error('State is required');
    }

    setSubmitting(true);
    try {
      const property = await savePropertyRegistryDraft(
        draftPropertyId,
        {
          form: values,
          step: 'documents',
          furthestStepIndex: 4,
        },
        { complete: true },
      );

      return { propertyId: property.id };
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add the property');
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const onPropertyCreated = (propertyId: string) => {
    router.push(`${propertyDetail(propertyId)}?tab=${encodeURIComponent('Documents')}`);
  };

  const resumeMode = Boolean(resumePropertyId || draftPropertyId);

  return (
    <AgentShell
      title={resumeMode ? 'Resume property' : 'Add property'}
      backHref={ROUTES.PROPERTIES}
      backLabel="Properties"
    >
      <div className="space-y-5">
        <p className="text-muted-foreground text-sm">
          {resumeMode
            ? 'Pick up where you left off. Changes save automatically as you work.'
            : 'Register a new property with landlord, tenant, and management details. To hand a property over to another agent, use Leasing → Transfer OUT.'}
        </p>

        {loadingDraft ? (
          <p className="text-muted-foreground text-sm">Loading saved property…</p>
        ) : resumePropertyId && !initialState ? null : (
          <NewPropertyRegistryForm
            onSubmit={onSubmitNewProperty}
            onPropertyCreated={apiConnected ? onPropertyCreated : undefined}
            submitting={submitting}
            initialState={initialState ?? undefined}
            onAutosave={apiConnected ? handleAutosave : undefined}
            autosaveStatus={autosaveStatus}
            resumeMode={resumeMode}
            draftPropertyId={draftPropertyId}
          />
        )}
      </div>
    </AgentShell>
  );
}
