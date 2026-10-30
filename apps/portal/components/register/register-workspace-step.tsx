'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AddressLineAutocomplete } from '@/components/end-leasing/address-line-autocomplete';
import {
  AUSTRALIAN_STATE_LABEL,
  AUSTRALIAN_STATE_ORDER,
} from '@/constants/api-enums';
import { saveRegisterWorkspaceDraft } from '@/lib/register-account-draft';
import type { RegistrationCountry } from '@/lib/registration-mobile';

const AGENT_GREEN = '#00bd85';

const inputClass =
  'h-12 w-full rounded-[9px] border border-[#CED9E4] bg-white px-3 text-sm outline-none placeholder:text-[#9AADC0] focus:border-[#00bd85]';

const addressInputClass =
  'h-12 rounded-[9px] border-[#CED9E4] bg-white pl-10 text-sm shadow-none focus-visible:border-[#00bd85] focus-visible:ring-0';

const schema = z.object({
  companyName: z.string().trim().min(1, 'Enter the company name.'),
  agencyName: z.string(),
  businessNumber: z.string(),
  licenceNumber: z.string(),
  state: z.string(),
  officeAddress: z.string().trim().min(1, 'Enter the office address.'),
});

type FormValues = z.infer<typeof schema>;

export function workspaceAvailabilityNote(region: RegistrationCountry, state: string): string {
  if (region === 'AU' && state === 'NSW') {
    return 'Free software is included. Optional Inspection Only and Full Service are currently available in NSW.';
  }
  return 'Free software and Cros AI are available. Crossub professional services are coming soon to this region.';
}

export function RegisterWorkspaceStep({
  region,
  onBack,
  onContinue,
}: {
  region: RegistrationCountry;
  onBack: () => void;
  onContinue: () => void;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyName: '',
      agencyName: '',
      businessNumber: '',
      licenceNumber: '',
      state: 'NSW',
      officeAddress: '',
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const state = watch('state');
  const officeAddress = watch('officeAddress');
  const businessLabel = region === 'NZ' ? 'NZBN' : 'ABN';
  const businessPlaceholder =
    region === 'NZ' ? 'New Zealand Business Number' : 'Australian Business Number';

  useEffect(() => {
    if (region === 'AU' && !state) setValue('state', 'NSW');
  }, [region, setValue, state]);

  const onCreate = (values: FormValues) => {
    if (region === 'AU' && !AUSTRALIAN_STATE_ORDER.some((code) => code === values.state)) {
      form.setError('state', { message: 'Select a state.' });
      return;
    }
    saveRegisterWorkspaceDraft({
      companyName: values.companyName.trim(),
      agencyName: values.agencyName.trim(),
      businessNumber: values.businessNumber.trim(),
      licenceNumber: values.licenceNumber.trim(),
      state: region === 'AU' ? values.state : '',
      officeAddress: values.officeAddress.trim(),
    });
    onContinue();
  };

  return (
    <form onSubmit={handleSubmit(onCreate)} className="mt-6 grid gap-4 sm:grid-cols-2" noValidate>
      <Field id="companyName" label="Company name" error={errors.companyName?.message}>
        <input
          id="companyName"
          placeholder="e.g. Skyline Realty"
          className={inputClass}
          {...register('companyName')}
        />
      </Field>

      <Field
        id="agencyName"
        label="Agency name"
        optional
        error={errors.agencyName?.message}
      >
        <input id="agencyName" className={inputClass} {...register('agencyName')} />
      </Field>

      <Field id="businessNumber" label={businessLabel} optional>
        <input
          id="businessNumber"
          placeholder={businessPlaceholder}
          className={inputClass}
          {...register('businessNumber')}
        />
      </Field>
      <Field id="licenceNumber" label="Licence number" optional>
        <input
          id="licenceNumber"
          placeholder="Licence number"
          className={inputClass}
          {...register('licenceNumber')}
        />
      </Field>

      {region === 'AU' ? (
        <Field id="state" label="State" error={errors.state?.message}>
          <select id="state" className={inputClass} {...register('state')}>
            {AUSTRALIAN_STATE_ORDER.map((code) => (
              <option key={code} value={code}>
                {AUSTRALIAN_STATE_LABEL[code]} ({code})
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      <Field
        id="officeAddress"
        label="Office address"
        error={errors.officeAddress?.message}
        className={region === 'AU' ? undefined : 'sm:col-span-2'}
      >
        <AddressLineAutocomplete
          id="officeAddress"
          value={officeAddress}
          country={region === 'NZ' ? 'nz' : 'au'}
          placeholder="Start typing office address"
          inputClassName={addressInputClass}
          onChange={(value) => setValue('officeAddress', value, { shouldValidate: true, shouldDirty: true })}
        />
      </Field>

      <p className="rounded-[12px] bg-[#E7FBF4] px-4 py-3 text-sm leading-6 text-[#147A5A] sm:col-span-2">
        <span className="mr-1.5" aria-hidden>
          ✓
        </span>
        {workspaceAvailabilityNote(region, state)}
      </p>

      <button
        type="submit"
        className="inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-[9px] text-sm font-semibold text-white sm:col-span-2"
        style={{ backgroundColor: AGENT_GREEN }}
      >
        Create my free workspace
        <ArrowRight className="size-4" />
      </button>

      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-[#52647C] sm:col-span-2"
      >
        <ArrowLeft className="size-4" />
        Back to account
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  optional,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {optional ? <span className="font-normal text-[#8AA0B5]"> (optional)</span> : null}
      </label>
      {children}
      {error ? <p className="text-xs text-[#D45656]">{error}</p> : null}
    </div>
  );
}
