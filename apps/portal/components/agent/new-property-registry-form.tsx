'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LandlordPartyCards } from '@/components/agent/landlord-party-cards';
import { TenancyTenantCards } from '@/components/agent/tenancy-tenant-cards';
import {
  PropertyDocumentsSection,
  PropertyLeasingDetailsSection,
  type ExtraLeasingDocumentRow,
  type LeasingDetailsValues,
} from '@/components/agent/property-leasing-details-section';
import {
  coerceStrataDetails,
  PropertyStrataDetailsSection,
  type StrataDetailsValues,
} from '@/components/agent/property-strata-details-section';
import {
  EMPTY_MANAGEMENT_DETAILS,
  PropertyManagementAgreementSection,
  PropertyManagementFeesSection,
  syncManagementFeesToScalars,
  type ManagementDetailsValues,
} from '@/components/agent/property-management-details-section';
import { PropertyAddressAutocomplete } from '@/components/agent/property-address-autocomplete';
import {
  PropertyDocumentPreviewDialog,
  type DocumentPreviewItem,
} from '@/components/agent/property-document-preview-dialog';
import type { StagedUploadFile, StagedUploadStatus } from '@/components/agent/staged-document-upload-row';
import {
  resolveWorkflowStepState,
  WorkflowProgressRail,
} from '@/components/agent/workflow-progress-rail';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  AUSTRALIAN_STATE_LABEL,
  AUSTRALIAN_STATE_ORDER,
  type AustralianStateKey,
  PROPERTY_TYPE_LABEL,
  PROPERTY_TYPE_ORDER,
  type PropertyType,
} from '@/constants/api-enums';
import {
  composeStreetAddress,
  type ParsedAustralianAddress,
} from '@/lib/google-places';
import {
  LEASE_STATUS_FORM_OPTIONS,
  mapLeaseStatusToPropertyStatus,
} from '@/lib/lease-status-options';
import {
  emptyPartyContact,
  MAX_TENANCY_TENANTS,
  splitParties,
} from '@/lib/property-parties';
import type { Property, PropertyPartyContact } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  queueFailedPropertyCreateUploads,
  uploadPropertyCreatePendingDocuments,
} from '@/lib/property-create-upload-flush';
import {
  isBlockedDocumentFile,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
} from '@/lib/file-upload';
import {
  canAutoSaveRegistry,
  type PropertyRegistryAutosaveState,
  type PropertyRegistryWizardStep,
} from '@/lib/property-registry-persist';
import { weeklyRentFromAmount } from '@/lib/rent-calculations';

const selectClass =
  'border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none dark:bg-input/30';

const WIZARD_STEPS = ['property', 'tenant', 'landlord', 'strata', 'documents'] as const;
type WizardStep = (typeof WIZARD_STEPS)[number];

const WIZARD_STEP_LABEL: Record<WizardStep, string> = {
  property: 'Property',
  tenant: 'Tenant',
  landlord: 'Landlord',
  strata: 'Strata',
  documents: 'Documents',
};

const EMPTY_LEASING: LeasingDetailsValues = {
  rentAmount: '',
  rentPeriod: '',
  agreementStart: '',
  agreementEnd: '',
  uploads: {},
  extraDocuments: [],
  extraPropertyDocuments: [],
};

function FormField({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-rose-600 dark:text-rose-400"> *</span>}
      </Label>
      {children}
    </div>
  );
}

export type FurnishedChoice = '' | 'yes' | 'no';

/** Files staged during create-property; uploaded when the property is completed. */
export interface PendingPropertyDocument {
  id: string;
  file: File;
  title: string;
  slotId: string;
  source: 'leasing' | 'management';
  uploadStatus?: StagedUploadStatus;
}

export interface NewPropertyRegistryValues {
  agencyName: string;
  agencyCompany: string;
  unit: string;
  streetNumber: string;
  streetName: string;
  /** Composed from unit / street number / street name for the API. */
  address: string;
  suburb: string;
  state: AustralianStateKey | '';
  postcode: string;
  latitude?: number;
  longitude?: number;
  propertyType: PropertyType | '';
  leaseStatus: Property['leaseStatus'] | '';
  bedrooms: string;
  bathrooms: string;
  parking: string;
  furnished: FurnishedChoice;
  /** Preferred cadence when occupied — kept for API, not shown on the property step. */
  routineInspectionFrequency: 2 | 3;
  /** Date-only (`YYYY-MM-DD`). Optional; defaults to today on a new form. */
  routineInspectionDue: string;
  landlords: PropertyPartyContact[];
  tenants: PropertyPartyContact[];
  strata: StrataDetailsValues;
  management: ManagementDetailsValues;
  leasing: LeasingDetailsValues;
  pendingDocuments: PendingPropertyDocument[];
}

export function todayIsoDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function mapLeaseStatusToPropertyStatusForApi(
  leaseStatus: Property['leaseStatus'],
): ReturnType<typeof mapLeaseStatusToPropertyStatus> {
  return mapLeaseStatusToPropertyStatus(leaseStatus);
}

const parseCount = (raw: string): number | undefined => {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

const parseMoney = (raw: string): number | undefined => {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

const parsePercent = (raw: string): number | undefined => {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : undefined;
};

function isCountFilled(raw: string): boolean {
  return raw.trim() !== '' && parseCount(raw) !== undefined;
}

function leasingRequired(form: NewPropertyRegistryValues): boolean {
  return form.leaseStatus !== '' && form.leaseStatus !== 'vacant';
}

type StepValidation = { valid: boolean; errors: string[] };

function validatePropertyStep(form: NewPropertyRegistryValues): StepValidation {
  const errors: string[] = [];
  if (!form.streetName.trim() && !form.streetNumber.trim()) {
    errors.push('Street name or street number is required');
  }
  if (!form.suburb.trim()) {
    errors.push('City / suburb is required');
  }
  if (!form.state) {
    errors.push('Select the property state or territory');
  }
  if (!form.postcode.trim() || form.postcode.trim().length < 4) {
    errors.push('A valid 4-digit postcode is required');
  }
  if (!form.propertyType) {
    errors.push('Select a property type');
  }
  if (!form.furnished) {
    errors.push('Select furnished or unfurnished');
  }
  if (!isCountFilled(form.bedrooms)) {
    errors.push('Bedrooms is required');
  }
  if (!isCountFilled(form.bathrooms)) {
    errors.push('Bathrooms is required');
  }
  if (!isCountFilled(form.parking)) {
    errors.push('Parking is required');
  }
  return { valid: errors.length === 0, errors };
}

function validateTenantStep(form: NewPropertyRegistryValues): StepValidation {
  const errors: string[] = [];
  if (!form.leaseStatus) {
    errors.push('Select a lease status');
  }
  if (!leasingRequired(form)) {
    return { valid: errors.length === 0, errors };
  }
  const { leasing } = form;
  if (!leasing.rentAmount.trim() || Number(leasing.rentAmount) <= 0) {
    errors.push('Rent amount is required');
  }
  if (!leasing.rentPeriod) {
    errors.push('Select a rent period');
  }
  if (!leasing.agreementStart) {
    errors.push('Agreement start date is required');
  }
  if (!leasing.agreementEnd) {
    errors.push('Agreement end date is required');
  }
  return { valid: errors.length === 0, errors };
}

function validateLandlordStep(form: NewPropertyRegistryValues): StepValidation {
  const errors: string[] = [];
  const landlords = splitParties(form.landlords);
  if (!landlords.primary?.name) {
    errors.push('At least one landlord name or company name is required');
  }
  return { valid: errors.length === 0, errors };
}

function runStepValidation(
  step: WizardStep,
  form: NewPropertyRegistryValues,
): StepValidation {
  switch (step) {
    case 'property':
      return validatePropertyStep(form);
    case 'tenant':
      return validateTenantStep(form);
    case 'landlord':
      return validateLandlordStep(form);
    case 'strata':
    case 'documents':
      return { valid: true, errors: [] };
    default:
      return { valid: true, errors: [] };
  }
}

function StepErrorsBanner({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <div
      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 dark:border-rose-900/50 dark:bg-rose-950/30"
      role="alert"
    >
      <p className="text-sm font-medium text-rose-800 dark:text-rose-300">
        Complete the required fields before continuing
      </p>
      <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs text-rose-700 dark:text-rose-400">
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </div>
  );
}

function patchUploadStatusInForm(
  values: NewPropertyRegistryValues,
  pendingId: string,
  uploadStatus: StagedUploadStatus,
): NewPropertyRegistryValues {
  const pending = values.pendingDocuments.find((d) => d.id === pendingId);
  if (!pending) return values;

  const patchFiles = (files: StagedUploadFile[]) =>
    files.map((file) => (file.id === pendingId ? { ...file, uploadStatus } : file));

  const nextPending = values.pendingDocuments.map((doc) =>
    doc.id === pendingId ? { ...doc, uploadStatus } : doc,
  );

  if (pending.source === 'leasing') {
    return {
      ...values,
      pendingDocuments: nextPending,
      leasing: {
        ...values.leasing,
        uploads: {
          ...values.leasing.uploads,
          [pending.slotId]: patchFiles(values.leasing.uploads[pending.slotId] ?? []),
        },
      },
    };
  }

  return {
    ...values,
    pendingDocuments: nextPending,
    management: {
      ...values.management,
      uploads: {
        ...values.management.uploads,
        [pending.slotId]: patchFiles(values.management.uploads[pending.slotId] ?? []),
      },
    },
  };
}

export function NewPropertyRegistryForm({
  onSubmit,
  onPropertyCreated,
  submitting,
  initialState,
  onAutosave,
  autosaveStatus = 'idle',
  resumeMode,
  draftPropertyId,
}: {
  onSubmit: (values: NewPropertyRegistryValues) => Promise<{ propertyId: string } | void>;
  onPropertyCreated?: (propertyId: string) => void;
  submitting: boolean;
  initialState?: PropertyRegistryAutosaveState;
  onAutosave?: (state: PropertyRegistryAutosaveState) => Promise<void>;
  autosaveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  resumeMode?: boolean;
  draftPropertyId?: string | null;
}) {
  const { primaryAgency, loading, apiConnected, refresh } = useAgentData();
  const agencyLocked = !!primaryAgency || apiConnected;
  const [step, setStep] = useState<PropertyRegistryWizardStep>(initialState?.step ?? 'property');
  const [furthestStepIndex, setFurthestStepIndex] = useState(initialState?.furthestStepIndex ?? 0);
  const [stepErrors, setStepErrors] = useState<Partial<Record<WizardStep, string[]>>>({});
  const [addressFieldsLocked, setAddressFieldsLocked] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<DocumentPreviewItem | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [form, setForm] = useState<NewPropertyRegistryValues>(() =>
    initialState?.form ?? {
    agencyName: primaryAgency?.name ?? '',
    agencyCompany: primaryAgency?.company ?? '',
    unit: '',
    streetNumber: '',
    streetName: '',
    address: '',
    suburb: '',
    state: '',
    postcode: '',
    propertyType: '',
    leaseStatus: '',
    bedrooms: '',
    bathrooms: '',
    parking: '',
    furnished: '',
    routineInspectionFrequency: 2,
    routineInspectionDue: todayIsoDate(),
    landlords: [emptyPartyContact({ isPrimary: true })],
    tenants: [emptyPartyContact({ isPrimary: true })],
    strata: coerceStrataDetails({}),
    management: { ...EMPTY_MANAGEMENT_DETAILS },
    leasing: { ...EMPTY_LEASING },
    pendingDocuments: [],
  });
  const skipAutosaveRef = useRef(true);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formRef = useRef(form);
  formRef.current = form;

  const set = <K extends keyof NewPropertyRegistryValues>(key: K, value: NewPropertyRegistryValues[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const stepIndex = WIZARD_STEPS.indexOf(step);
  const requireLeasing = leasingRequired(form);

  useEffect(() => {
    setStepErrors((prev) => {
      const currentErrors = prev[step];
      if (!currentErrors?.length) return prev;
      const result = runStepValidation(step, form);
      if (result.valid) {
        return { ...prev, [step]: undefined };
      }
      return prev;
    });
  }, [form, step]);

  useEffect(() => {
    if (!primaryAgency || initialState) return;
    setForm((f) => ({
      ...f,
      agencyName: primaryAgency.name,
      agencyCompany: primaryAgency.company ?? '',
    }));
  }, [primaryAgency, initialState]);

  useEffect(() => {
    if (!onAutosave || !apiConnected || submitting || completing) return;
    if (!canAutoSaveRegistry(form)) return;

    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = setTimeout(() => {
      void onAutosave({ form, step, furthestStepIndex });
    }, 1500);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [form, step, furthestStepIndex, onAutosave, apiConnected, submitting, completing]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const stageDocument = useCallback(
    (
      file: File,
      slotId: string,
      source: 'leasing' | 'management',
      title?: string,
    ): PendingPropertyDocument | null => {
      if (isBlockedDocumentFile(file)) {
        toast.error(`${file.name} is not supported (videos and GIFs are not allowed)`);
        return null;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error(`${file.name} exceeds the ${MAX_UPLOAD_LABEL} limit`);
        return null;
      }
      const displayTitle = title?.trim() || file.name;
      const pendingId = `${source}-${slotId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const uploadStatus: StagedUploadStatus | undefined = apiConnected ? 'staged' : undefined;
      const stagedFile: StagedUploadFile = {
        id: pendingId,
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        uploadStatus,
      };
      const doc: PendingPropertyDocument = {
        id: pendingId,
        file,
        title: displayTitle,
        slotId,
        source,
        uploadStatus,
      };

      setForm((f) => {
        const nextPending: PendingPropertyDocument[] = [...f.pendingDocuments, doc];
        if (source === 'leasing') {
          return {
            ...f,
            pendingDocuments: nextPending,
            leasing: {
              ...f.leasing,
              uploads: {
                ...f.leasing.uploads,
                [slotId]: [...(f.leasing.uploads[slotId] ?? []), stagedFile],
              },
            },
          };
        }
        return {
          ...f,
          pendingDocuments: nextPending,
          management: {
            ...f.management,
            uploads: {
              ...f.management.uploads,
              [slotId]: [...(f.management.uploads[slotId] ?? []), stagedFile],
            },
          },
        };
      });
      return doc;
    },
    [apiConnected],
  );

  const handleLeasingUpload = useCallback(
    async (file: File, slotId: string, title?: string) => {
      stageDocument(file, slotId, 'leasing', title);
    },
    [stageDocument],
  );

  const handleManagementUpload = useCallback(
    async (file: File, slotId: string, title?: string) => {
      stageDocument(file, slotId, 'management', title);
    },
    [stageDocument],
  );

  const removeStagedDocument = useCallback((file: StagedUploadFile, slotId: string) => {
    setForm((f) => {
      const staged = f.pendingDocuments.find((d) => d.id === file.id);
      if (!staged) return f;
      const nextPending = f.pendingDocuments.filter((d) => d.id !== file.id);
      if (staged.source === 'leasing') {
        return {
          ...f,
          pendingDocuments: nextPending,
          leasing: {
            ...f.leasing,
            uploads: {
              ...f.leasing.uploads,
              [slotId]: (f.leasing.uploads[slotId] ?? []).filter((entry) => entry.id !== file.id),
            },
          },
        };
      }
      return {
        ...f,
        pendingDocuments: nextPending,
        management: {
          ...f.management,
          uploads: {
            ...f.management.uploads,
            [slotId]: (f.management.uploads[slotId] ?? []).filter((entry) => entry.id !== file.id),
          },
        },
      };
    });
  }, []);

  const handlePreviewStagedFile = useCallback(
    (file: StagedUploadFile) => {
      const staged = form.pendingDocuments.find((d) => d.id === file.id);
      if (!staged) return;
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      const url = URL.createObjectURL(staged.file);
      previewUrlRef.current = url;
      setPreviewDoc({
        title: staged.title || staged.file.name,
        fileName: staged.file.name,
        uploadedAt: file.uploadedAt,
        href: url,
      });
    },
    [form.pendingDocuments],
  );

  const closePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewDoc(null);
  }, []);

  const handlePlaceSelect = useCallback((parsed: ParsedAustralianAddress) => {
    setForm((f) => ({
      ...f,
      unit: parsed.unit,
      streetNumber: parsed.streetNumber,
      streetName: parsed.streetName,
      address: parsed.address,
      suburb: parsed.suburb || f.suburb,
      state: parsed.state || f.state,
      postcode: parsed.postcode || f.postcode,
      latitude: parsed.lat,
      longitude: parsed.lng,
    }));
  }, []);

  const setAddressPart = (
    key: 'unit' | 'streetNumber' | 'streetName' | 'suburb' | 'state' | 'postcode',
    value: string,
  ) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === 'unit' || key === 'streetNumber' || key === 'streetName') {
        next.address = composeStreetAddress(next.unit, next.streetNumber, next.streetName);
        // Unit is optional — keep map coordinates when only the unit label changes.
        if (key === 'streetNumber' || key === 'streetName') {
          next.latitude = undefined;
          next.longitude = undefined;
        }
      }
      return next;
    });
  };

  const patchLeasing = (patch: Partial<LeasingDetailsValues>) => {
    setForm((f) => ({ ...f, leasing: { ...f.leasing, ...patch } }));
  };

  const patchStrata = (patch: Partial<StrataDetailsValues>) => {
    setForm((f) => ({ ...f, strata: { ...f.strata, ...patch } }));
  };

  const patchManagement = (patch: Partial<ManagementDetailsValues>) => {
    setForm((f) => ({ ...f, management: { ...f.management, ...patch } }));
  };

  const validateAndRecordStep = useCallback(
    (targetStep: WizardStep): boolean => {
      const result = runStepValidation(targetStep, form);
      setStepErrors((prev) => ({
        ...prev,
        [targetStep]: result.errors.length > 0 ? result.errors : undefined,
      }));
      return result.valid;
    },
    [form],
  );

  const validateStepsThrough = useCallback(
    (throughIndex: number): WizardStep | null => {
      for (let i = 0; i <= throughIndex; i++) {
        const wizardStep = WIZARD_STEPS[i];
        if (!validateAndRecordStep(wizardStep)) return wizardStep;
      }
      return null;
    },
    [validateAndRecordStep],
  );

  const goToStep = useCallback(
    (target: WizardStep) => {
      const targetIdx = WIZARD_STEPS.indexOf(target);
      if (targetIdx < 0) return;

      if (targetIdx > stepIndex) {
        for (let i = stepIndex; i < targetIdx; i++) {
          const wizardStep = WIZARD_STEPS[i];
          if (!validateAndRecordStep(wizardStep)) {
            setStep(wizardStep);
            return;
          }
        }
        setFurthestStepIndex((f) => Math.max(f, targetIdx));
      }

      setStep(target);
    },
    [stepIndex, validateAndRecordStep],
  );

  const goNext = () => {
    if (!validateAndRecordStep(step)) return;
    const nextIdx = stepIndex + 1;
    if (nextIdx < WIZARD_STEPS.length) {
      setFurthestStepIndex((f) => Math.max(f, nextIdx));
      setStep(WIZARD_STEPS[nextIdx]);
    }
  };

  const goBack = () => {
    const prev = WIZARD_STEPS[stepIndex - 1];
    if (prev) setStep(prev);
  };

  const handleSubmit = async () => {
    const failingStep = validateStepsThrough(WIZARD_STEPS.indexOf('landlord'));
    if (failingStep) {
      setStep(failingStep);
      return;
    }

    setCompleting(true);
    try {
      const result = await onSubmit({
        ...form,
        address: composeStreetAddress(form.unit, form.streetNumber, form.streetName),
        management: {
          ...form.management,
          ...syncManagementFeesToScalars(form.management),
        },
        agencyName: apiConnected
          ? (primaryAgency?.name ?? form.agencyName)
          : agencyLocked
            ? (primaryAgency?.name ?? form.agencyName)
            : form.agencyName,
        agencyCompany: apiConnected
          ? (primaryAgency?.company ?? form.agencyCompany)
          : agencyLocked
            ? (primaryAgency?.company ?? form.agencyCompany)
            : form.agencyCompany,
      });

      const propertyId = result?.propertyId;
      if (!propertyId) return;

      const pending = formRef.current.pendingDocuments;
      if (apiConnected && pending.length > 0) {
        const { succeeded, failed, failedDocs } = await uploadPropertyCreatePendingDocuments(
          propertyId,
          pending,
        );
        await refresh();
        if (failed > 0) {
          await queueFailedPropertyCreateUploads(propertyId, failedDocs);
        }
        if (failed === 0) {
          toast.success(
            pending.length === 1
              ? 'Property and document saved'
              : `Property saved — ${succeeded} documents uploaded`,
          );
        } else if (succeeded > 0) {
          toast.warning(
            `Property saved — ${succeeded} uploaded, ${failed} failed. Retry the rest on the Documents tab.`,
          );
        } else {
          toast.error(
            'Property saved but document uploads failed. Retry on the Documents tab.',
          );
        }
      }

      onPropertyCreated?.(propertyId);
    } finally {
      setCompleting(false);
    }
  };

  const formBusy = submitting || completing;

  if (apiConnected && loading && !primaryAgency) {
    return (
      <p className="text-muted-foreground text-sm">Loading your agency profile…</p>
    );
  }

  if (apiConnected && !loading && !primaryAgency) {
    return (
      <p className="text-muted-foreground text-sm">
        Your agency profile is not set up yet. Complete registration before adding properties.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {resumeMode ? (
          <p className="text-muted-foreground text-xs">
            Continue registering this property. Your progress is saved automatically.
          </p>
        ) : null}
        {apiConnected && onAutosave ? (
          <p
            className={cn(
              'text-xs tabular-nums',
              !resumeMode && 'ml-auto',
              autosaveStatus === 'error'
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-muted-foreground',
            )}
          >
            {autosaveStatus === 'saving'
              ? 'Saving…'
              : autosaveStatus === 'saved'
                ? 'Saved'
                : autosaveStatus === 'error'
                  ? 'Save failed'
                  : canAutoSaveRegistry(form)
                    ? 'Auto-save on'
                    : null}
          </p>
        ) : null}
      </div>

      <WorkflowProgressRail
        steps={WIZARD_STEPS}
        labels={WIZARD_STEP_LABEL}
        currentStep={step}
        showStatusCaption={false}
        labelCasing="sentence"
        getStepState={(s) => {
          const idx = WIZARD_STEPS.indexOf(s);
          const isDone = idx <= furthestStepIndex && s !== step;
          return resolveWorkflowStepState(isDone, s === step);
        }}
        isStepCompleted={(s) => {
          const idx = WIZARD_STEPS.indexOf(s);
          return idx <= furthestStepIndex && s !== step;
        }}
        onStepClick={goToStep}
        isStepEnabled={(s) => WIZARD_STEPS.indexOf(s) <= furthestStepIndex}
        stepHasError={(s: WizardStep) => (stepErrors[s]?.length ?? 0) > 0}
      />

      <p className="text-muted-foreground -mt-1 text-center text-xs">
        Step {stepIndex + 1} of {WIZARD_STEPS.length} — {WIZARD_STEP_LABEL[step]}
        {furthestStepIndex > stepIndex ? (
          <span className="text-primary/80">
            {' '}
            · furthest reached: {WIZARD_STEP_LABEL[WIZARD_STEPS[furthestStepIndex]]}
          </span>
        ) : null}
      </p>

      <StepErrorsBanner errors={stepErrors[step] ?? []} />

      {step === 'property' ? (
        <div className="space-y-5 rounded-lg border border-border/60 bg-card p-4">
          <p className="text-sm font-semibold">Property details</p>

          <PropertyAddressAutocomplete
              onPlaceSelect={handlePlaceSelect}
              latitude={form.latitude}
              longitude={form.longitude}
              onMapsStatusChange={({ enabled, failed }) => {
                setAddressFieldsLocked(enabled && !failed);
              }}
              locationFields={
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Latitude">
                      <Input
                        readOnly
                        value={
                          form.latitude != null ? form.latitude.toFixed(6) : ''
                        }
                        placeholder="—"
                        className="bg-muted/40 font-mono text-xs"
                      />
                    </FormField>
                    <FormField label="Longitude">
                      <Input
                        readOnly
                        value={
                          form.longitude != null ? form.longitude.toFixed(6) : ''
                        }
                        placeholder="—"
                        className="bg-muted/40 font-mono text-xs"
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Unit">
                      <Input
                        value={form.unit}
                        onChange={(e) => setAddressPart('unit', e.target.value)}
                        placeholder="e.g. 12 — optional"
                      />
                    </FormField>
                    <FormField label="Street number" required>
                      <Input
                        value={form.streetNumber}
                        onChange={(e) => setAddressPart('streetNumber', e.target.value)}
                        placeholder="e.g. 66"
                        required
                        disabled={addressFieldsLocked}
                        readOnly={addressFieldsLocked}
                        className={cn(addressFieldsLocked && 'bg-muted/40')}
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Street name" required>
                      <Input
                        value={form.streetName}
                        onChange={(e) => setAddressPart('streetName', e.target.value)}
                        placeholder="e.g. Berry Street"
                        required
                        disabled={addressFieldsLocked}
                        readOnly={addressFieldsLocked}
                        className={cn(addressFieldsLocked && 'bg-muted/40')}
                      />
                    </FormField>
                    <FormField label="City / suburb" required>
                      <Input
                        value={form.suburb}
                        onChange={(e) => setAddressPart('suburb', e.target.value)}
                        placeholder="e.g. Bondi Beach"
                        required
                        disabled={addressFieldsLocked}
                        readOnly={addressFieldsLocked}
                        className={cn(addressFieldsLocked && 'bg-muted/40')}
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="State / territory" required>
                      <select
                        value={form.state}
                        onChange={(e) =>
                          setAddressPart('state', e.target.value as AustralianStateKey)
                        }
                        className={cn(selectClass, addressFieldsLocked && 'bg-muted/40')}
                        required
                        disabled={addressFieldsLocked}
                      >
                        <option value="">Select state</option>
                        {AUSTRALIAN_STATE_ORDER.map((s) => (
                          <option key={s} value={s}>
                            {s} — {AUSTRALIAN_STATE_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Postcode" required>
                      <Input
                        value={form.postcode}
                        onChange={(e) =>
                          setAddressPart(
                            'postcode',
                            e.target.value.replace(/\D/g, '').slice(0, 4),
                          )
                        }
                        placeholder="e.g. 2193"
                        inputMode="numeric"
                        required
                        disabled={addressFieldsLocked}
                        readOnly={addressFieldsLocked}
                        className={cn(addressFieldsLocked && 'bg-muted/40')}
                      />
                    </FormField>
                  </div>
                </>
              }
            />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FormField label="Type" required>
              <select
                value={form.propertyType}
                onChange={(e) => set('propertyType', e.target.value as PropertyType | '')}
                className={selectClass}
                required
              >
                <option value="">Select type</option>
                {PROPERTY_TYPE_ORDER.map((t) => (
                  <option key={t} value={t}>
                    {PROPERTY_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Furnished" required>
              <select
                value={form.furnished}
                onChange={(e) => set('furnished', e.target.value as FurnishedChoice)}
                className={selectClass}
                required
              >
                <option value="">Select…</option>
                <option value="no">Unfurnished</option>
                <option value="yes">Furnished</option>
              </select>
            </FormField>
            <FormField label="Routine inspection due">
              <Input
                type="date"
                value={form.routineInspectionDue}
                onChange={(e) => set('routineInspectionDue', e.target.value)}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <FormField label="Beds" required>
              <Input
                type="number"
                min={0}
                value={form.bedrooms}
                onChange={(e) => set('bedrooms', e.target.value)}
                placeholder="0"
                required
              />
            </FormField>
            <FormField label="Baths" required>
              <Input
                type="number"
                min={0}
                value={form.bathrooms}
                onChange={(e) => set('bathrooms', e.target.value)}
                placeholder="0"
                required
              />
            </FormField>
            <FormField label="Parking" required>
              <Input
                type="number"
                min={0}
                value={form.parking}
                onChange={(e) => set('parking', e.target.value)}
                placeholder="0"
                required
              />
            </FormField>
          </div>
        </div>
      ) : null}

      {step === 'tenant' ? (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="rounded-lg border border-border/60 bg-card p-4">
              <FormField label="Lease status" required>
                <select
                  value={form.leaseStatus}
                  onChange={(e) =>
                    set('leaseStatus', e.target.value as Property['leaseStatus'] | '')
                  }
                  className={cn(selectClass, 'sm:max-w-xs')}
                  required
                >
                  <option value="">Select status</option>
                  {LEASE_STATUS_FORM_OPTIONS.map((option, index) => (
                    <option key={`${option.value}-${option.label}-${index}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Tenancy details</p>
                <p className="text-muted-foreground text-xs">
                  One card per tenant. Only one primary contact per tenancy.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-primary hover:bg-primary/10 -mt-0.5 h-8 shrink-0 px-2 text-xs font-medium"
                disabled={formBusy || form.tenants.length >= MAX_TENANCY_TENANTS}
                onClick={() =>
                  setForm((f) =>
                    f.tenants.length >= MAX_TENANCY_TENANTS
                      ? f
                      : { ...f, tenants: [...f.tenants, emptyPartyContact()] },
                  )
                }
              >
                <Plus className="size-3.5" />
                Add another tenant
              </Button>
            </div>

            <TenancyTenantCards
              parties={form.tenants}
              onChange={(tenants) => setForm((f) => ({ ...f, tenants }))}
              disabled={formBusy}
            />
          </div>

          <PropertyLeasingDetailsSection
            values={form.leasing}
            onChange={patchLeasing}
            required={requireLeasing}
            disabled={formBusy}
          />
        </div>
      ) : null}

      {step === 'landlord' ? (
        <div className="space-y-4">
          <div className="space-y-3 rounded-lg border border-border/60 bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Landlord details</p>
                <p className="text-muted-foreground text-xs">
                  At least one landlord is required.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-primary hover:bg-primary/10 -mt-0.5 h-8 shrink-0 px-2 text-xs font-medium"
                disabled={formBusy}
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    landlords: [...f.landlords, emptyPartyContact()],
                  }))
                }
              >
                <Plus className="size-3.5" />
                Add landlord
              </Button>
            </div>
            <LandlordPartyCards
              parties={form.landlords}
              onChange={(landlords) => setForm((f) => ({ ...f, landlords }))}
              disabled={formBusy}
            />
          </div>

          <PropertyManagementAgreementSection
            values={form.management}
            onUploadFile={handleManagementUpload}
            onPreviewFile={handlePreviewStagedFile}
            onRemoveFile={removeStagedDocument}
            disabled={formBusy}
            stagingOnly={apiConnected}
          />

          <PropertyManagementFeesSection
            values={form.management}
            onChange={patchManagement}
            disabled={formBusy}
            weeklyRentAud={
              weeklyRentFromAmount(
                Number(form.leasing.rentAmount.replace(/,/g, '')),
                form.leasing.rentPeriod,
              ) || undefined
            }
          />
        </div>
      ) : null}

      {step === 'strata' ? (
        <PropertyStrataDetailsSection
          values={form.strata}
          onChange={patchStrata}
          disabled={formBusy}
        />
      ) : null}

      {step === 'documents' ? (
        <PropertyDocumentsSection
          values={form.leasing}
          onChange={patchLeasing}
          management={form.management}
          onChangeManagement={patchManagement}
          onUploadFile={handleLeasingUpload}
          onUploadManagementFile={handleManagementUpload}
          onPreviewFile={handlePreviewStagedFile}
          onRemoveFile={removeStagedDocument}
          disabled={formBusy}
          stagingOnly={apiConnected}
        />
      ) : null}

      <div className="flex gap-2">
        {stepIndex > 0 ? (
          <Button type="button" variant="outline" className="flex-1" onClick={goBack} disabled={formBusy}>
            Back
          </Button>
        ) : null}
        {step !== 'documents' ? (
          <Button type="button" className="flex-1" onClick={goNext} disabled={formBusy}>
            Next
          </Button>
        ) : (
          <Button type="button" className="flex-1" disabled={formBusy} onClick={handleSubmit}>
            {formBusy ? 'Saving…' : resumeMode ? 'Complete property' : 'Add property'}
          </Button>
        )}
      </div>

      <PropertyDocumentPreviewDialog
        doc={previewDoc}
        propertyAddress={composeStreetAddress(form.unit, form.streetNumber, form.streetName) || 'New property'}
        open={previewDoc != null}
        onClose={closePreview}
      />
    </div>
  );
}

export { parseCount, parseMoney, parsePercent, mapLeaseStatusToPropertyStatusForApi };
export type {
  ExtraLeasingDocumentRow,
  LeasingDetailsValues,
  ManagementDetailsValues,
  StrataDetailsValues,
};
