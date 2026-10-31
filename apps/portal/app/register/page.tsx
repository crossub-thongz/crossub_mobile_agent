'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, ChartColumn, ChevronDown, Eye, EyeOff, House, Lock, Mail, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useAuth } from '@/components/providers/auth-provider';
import { PhoneCountryField } from '@/components/register/phone-country-field';
import { RegisterReadyStep } from '@/components/register/register-ready-step';
import { RegisterWorkspaceStep } from '@/components/register/register-workspace-step';
import { AUSTRALIAN_STATE_ORDER } from '@/constants/api-enums';
import { PASSWORD_MAX, PASSWORD_MIN } from '@/constants/auth';
import { ROUTES } from '@/constants/routes';
import {
  registerAgentAccount,
  registerAgentErrorMessage,
} from '@/lib/agent-registration';
import {
  readRegisterWorkspaceDraft,
  saveRegisterAccountDraft,
} from '@/lib/register-account-draft';
import { DEFAULT_REGISTER_SERVICE_LEVEL } from '@/lib/portal-service-level';
import { postAuthDestination } from '@/lib/system-access-agreement';
import {
  isPhoneCountry,
  phoneCountryMeta,
  registrationMobileMessage,
  type PhoneCountry,
  type RegistrationCountry,
} from '@/lib/registration-mobile';

const AGENT_GREEN = '#00bd85';

const STEPS = ['Account', 'Workspace', 'Ready'] as const;

const REGIONS: { code: RegistrationCountry; label: string; dial: string }[] = [
  { code: 'AU', label: 'Australia', dial: '+61' },
  { code: 'NZ', label: 'New Zealand', dial: '+64' },
];

const LEGAL: Record<RegistrationCountry, { terms: string; privacy: string }> = {
  AU: {
    terms: 'https://www.crossub.com/AU/terms',
    privacy: 'https://www.crossub.com/AU/privacy',
  },
  NZ: {
    terms: 'https://www.crossub.com/NZ/terms',
    privacy: 'https://www.crossub.com/NZ/privacy',
  },
};

const schema = z
  .object({
    firstName: z.string().trim().min(1, 'Enter your first name.'),
    lastName: z.string().trim().min(1, 'Enter your last name.'),
    email: z
      .string()
      .trim()
      .min(1, 'Enter your business email.')
      .email('Enter a valid business email.'),
    password: z
      .string()
      .min(1, 'Enter a password.')
      .min(PASSWORD_MIN, `At least ${PASSWORD_MIN} characters.`)
      .max(PASSWORD_MAX),
    confirmPassword: z.string().min(1, 'Confirm your password.'),
    phoneCountry: z.string(),
    phone: z.string().trim().min(1, 'Enter a mobile number.'),
    region: z.string(),
  })
  .superRefine((value, ctx) => {
    if (!isPhoneCountry(value.phoneCountry)) {
      ctx.addIssue({ code: 'custom', path: ['phoneCountry'], message: 'Select a country code.' });
    }
    if (value.region !== 'AU' && value.region !== 'NZ') {
      ctx.addIssue({ code: 'custom', path: ['region'], message: 'Select your region.' });
    }
    if (value.confirmPassword && value.password !== value.confirmPassword) {
      ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Passwords do not match.' });
    }
    if (isPhoneCountry(value.phoneCountry) && value.phone.trim()) {
      const message = registrationMobileMessage(value.phone, value.phoneCountry);
      if (message) ctx.addIssue({ code: 'custom', path: ['phone'], message });
    }
  });

type FormValues = z.infer<typeof schema>;

const inputClass =
  'h-12 w-full rounded-[9px] border border-[#CED9E4] bg-white px-3 text-sm outline-none placeholder:text-[#9AADC0] focus:border-[#00bd85]';

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const router = useRouter();
  const { refresh } = useAuth();
  const phoneCountryTouched = useRef(false);
  const regionTouched = useRef(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      phoneCountry: 'AU',
      phone: '',
      region: 'AU',
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, touchedFields, isSubmitted },
  } = form;

  const region = watch('region');
  const phoneCountry = watch('phoneCountry');
  const phone = watch('phone');
  const legal = region === 'AU' || region === 'NZ' ? LEGAL[region] : null;
  const phoneLive =
    phone.trim() && isPhoneCountry(phoneCountry)
      ? registrationMobileMessage(phone, phoneCountry)
      : null;

  useEffect(() => {
    const apply = (country: 'AU' | 'NZ') => {
      if (!regionTouched.current) setValue('region', country);
      if (!phoneCountryTouched.current) setValue('phoneCountry', country);
    };
    const requested = new URLSearchParams(window.location.search).get('country')?.toUpperCase();
    if (requested === 'AU' || requested === 'NZ') {
      apply(requested);
      return;
    }
    let cancelled = false;
    void fetch('/api/geo-country')
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { country?: string | null } | null) => {
        if (cancelled || phoneCountryTouched.current) return;
        apply(body?.country === 'NZ' ? 'NZ' : 'AU');
      })
      .catch(() => {
        if (!cancelled && !phoneCountryTouched.current) apply('AU');
      });
    return () => {
      cancelled = true;
    };
  }, [setValue]);

  const chooseRegion = (next: string) => {
    regionTouched.current = true;
    setValue('region', next, { shouldValidate: true });
    if (!phoneCountryTouched.current && (next === 'AU' || next === 'NZ')) {
      setValue('phoneCountry', next, { shouldValidate: Boolean(phone.trim()) });
    }
  };

  const onContinue = (values: FormValues) => {
    if (!isPhoneCountry(values.phoneCountry)) return;
    if (values.region !== 'AU' && values.region !== 'NZ') return;
    saveRegisterAccountDraft({
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      password: values.password,
      phoneCountry: values.phoneCountry as PhoneCountry,
      phone: values.phone.trim(),
      region: values.region,
    });
    setWorkspaceOpen(true);
    setStep(2);
  };

  const startTrip = async () => {
    const account = form.getValues();
    const workspace = readRegisterWorkspaceDraft();
    if (!isPhoneCountry(account.phoneCountry)) return;
    if (account.region !== 'AU' && account.region !== 'NZ') return;
    if (!workspace) {
      toast.error('Go back and complete the workspace step.');
      return;
    }
    const state = AUSTRALIAN_STATE_ORDER.find((code) => code === workspace.state);

    setStarting(true);
    try {
      const user = await registerAgentAccount({
        email: account.email,
        password: account.password,
        firstName: account.firstName,
        lastName: account.lastName,
        agencyName: workspace.companyName,
        agencyCompany: workspace.agencyName || undefined,
        phone: account.phone,
        phoneCountry: account.phoneCountry,
        region: account.region,
        state: account.region === 'AU' ? state : undefined,
        abn: account.region === 'AU' ? workspace.businessNumber || undefined : undefined,
        nzbn: account.region === 'NZ' ? workspace.businessNumber || undefined : undefined,
        licenceNumber: workspace.licenceNumber || undefined,
        officeAddress: workspace.officeAddress,
        portalServiceLevel: DEFAULT_REGISTER_SERVICE_LEVEL,
        acceptTerms: true,
      });
      await refresh();
      router.replace(
        postAuthDestination(
          user,
          ROUTES.DASHBOARD,
          ROUTES.SYSTEM_ACCESS_AGREEMENT,
          ROUTES.CHANGE_PASSWORD,
        ),
      );
    } catch (err) {
      setStarting(false);
      toast.error(registerAgentErrorMessage(err));
    }
  };

  return (
    <div
      className="relative flex min-h-[calc(100dvh-var(--env-banner-height,0px))] flex-col pt-6 pb-16 text-[#0D1836]"
      style={{
        backgroundColor: '#F6FCFC',
        backgroundImage: 'url(/login/agent-bg.svg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <main className="mx-auto mt-6 grid w-full max-w-6xl items-start gap-10 px-5 sm:px-8 lg:mt-8 lg:grid-cols-2 lg:gap-16 lg:px-10">
        <section className="max-w-xl">
          <div className="flex items-center gap-2.5">
            <Image src="/crossub-logo.png" alt="" width={36} height={36} priority className="size-9" />
            <span className="text-[16px] font-bold tracking-[0.16em]">CROSSUB</span>
          </div>
          <div className="mt-10 flex items-center gap-3">
            <span className="h-0.5 w-8 rounded-full" style={{ backgroundColor: AGENT_GREEN }} />
            <p className="text-xs font-semibold tracking-[0.16em]" style={{ color: AGENT_GREEN }}>
              AGENT PORTAL
            </p>
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[#0D1836] sm:text-5xl sm:leading-[1.05]">
            Smarter property management
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-[#52647C]">
            Everything you need to manage properties, tenants and growth in one powerful platform.
          </p>
          <ul className="mt-10 space-y-7">
            <Feature
              icon={ChartColumn}
              title="Streamline operations"
              body="Save time with automated workflows and rent tracking."
            />
            <Feature
              icon={Users}
              title="Build stronger relationships"
              body="Keep owners and tenants happier, all in one place."
            />
            <Feature
              icon={House}
              title="Grow your portfolio"
              body="Powerful insights to help you scale with confidence."
            />
          </ul>
        </section>

        <section className="w-full justify-self-end rounded-[22px] bg-white p-6 shadow-[0_18px_48px_rgba(13,24,54,0.10)] sm:p-8">
          <ol className="mb-6 flex items-center">
            {STEPS.map((label, index) => (
              <li key={label} className="flex min-w-0 flex-1 items-center">
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: index < step ? AGENT_GREEN : '#D5DEE8',
                    color: index < step ? '#fff' : '#6D8094',
                  }}
                >
                  {index + 1}
                </span>
                <span
                  className="ml-2 truncate text-xs font-medium"
                  style={{ color: index < step ? '#0D1836' : '#8AA0B5' }}
                >
                  {label}
                </span>
                {index < STEPS.length - 1 ? (
                  <span className="mx-2 h-px flex-1 bg-[#E3EAF1]" />
                ) : null}
              </li>
            ))}
          </ol>

          <div className={step === 1 ? undefined : 'hidden'}>
          <h2 className="text-2xl font-semibold tracking-tight">Create your free account</h2>
          <p className="mt-1 text-sm text-[#52647C]">
            Let&apos;s get you started. Your free workspace is just a few steps away.
          </p>

          <form onSubmit={handleSubmit(onContinue)} className="mt-6 grid gap-4 sm:grid-cols-2" noValidate>
            <Field id="firstName" label="First name" error={errors.firstName?.message}>
              <input id="firstName" autoComplete="given-name" className={inputClass} {...register('firstName')} />
            </Field>
            <Field id="lastName" label="Last name" error={errors.lastName?.message}>
              <input id="lastName" autoComplete="family-name" className={inputClass} {...register('lastName')} />
            </Field>

            <Field id="email" label="Business email" error={errors.email?.message}>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8AA0B5]" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@agency.com"
                  className={`${inputClass} pr-3 pl-10`}
                  {...register('email')}
                />
              </div>
            </Field>

            <Field id="password" label="Password" error={errors.password?.message}>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8AA0B5]" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder={`At least ${PASSWORD_MIN} characters`}
                  className={`${inputClass} pr-10 pl-10`}
                  {...register('password')}
                />
                <PasswordToggle shown={showPassword} onToggle={() => setShowPassword((value) => !value)} />
              </div>
            </Field>

            <Field id="region" label="Select your region" error={errors.region?.message}>
              <div className="relative">
                <select
                  id="region"
                  className="h-12 w-full cursor-pointer appearance-none rounded-[9px] border border-[#CED9E4] bg-white pr-10 pl-3 text-sm font-medium text-[#171E4B] outline-none focus:border-[#00bd85]"
                  value={region}
                  onChange={(event) => chooseRegion(event.target.value)}
                >
                  <option value="">Select your region</option>
                  {REGIONS.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[#52647C]" />
              </div>
            </Field>

            <Field id="confirmPassword" label="Confirm password" error={errors.confirmPassword?.message}>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8AA0B5]" />
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  className={`${inputClass} pr-10 pl-10`}
                  {...register('confirmPassword')}
                />
                <PasswordToggle
                  shown={showConfirm}
                  label="confirm password"
                  onToggle={() => setShowConfirm((value) => !value)}
                />
              </div>
            </Field>

            <div className="sm:col-span-2">
            <Field
              id="phone"
              label="Mobile number"
              error={
                errors.phoneCountry?.message ||
                (touchedFields.phone || isSubmitted
                  ? phone.trim()
                    ? phoneLive || undefined
                    : errors.phone?.message
                  : undefined)
              }
            >
              <PhoneCountryField
                country={isPhoneCountry(phoneCountry) ? phoneCountry : 'AU'}
                placeholder={phoneCountryMeta(isPhoneCountry(phoneCountry) ? phoneCountry : 'AU').placeholder}
                phoneProps={{ id: 'phone', ...register('phone') }}
                onCountryChange={(next) => {
                  phoneCountryTouched.current = true;
                  setValue('phoneCountry', next, { shouldValidate: Boolean(phone.trim()) });
                  if (next === 'AU' || next === 'NZ') {
                    regionTouched.current = true;
                    setValue('region', next, { shouldValidate: true });
                  }
                }}
              />
            </Field>
            </div>

            <button
              type="submit"
              className="inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-[9px] text-sm font-semibold text-white sm:col-span-2"
              style={{ backgroundColor: AGENT_GREEN }}
            >
              Continue to workspace
              <ArrowRight className="size-4" />
            </button>
          </form>

          <p className="mt-4 text-center text-xs leading-5 text-[#8AA0B5]">
            By continuing, you agree to the{' '}
            {legal ? (
              <a href={legal.terms} target="_blank" rel="noopener noreferrer" className="font-medium underline" style={{ color: AGENT_GREEN }}>
                Terms of Use
              </a>
            ) : (
              <span>Terms of Use</span>
            )}{' '}
            and{' '}
            {legal ? (
              <a href={legal.privacy} target="_blank" rel="noopener noreferrer" className="font-medium underline" style={{ color: AGENT_GREEN }}>
                Privacy Policy
              </a>
            ) : (
              <span>Privacy Policy</span>
            )}
            .
          </p>

          <p className="mt-5 text-center text-sm text-[#52647C]">
            Already registered?{' '}
            <Link href={ROUTES.LOGIN} className="font-semibold" style={{ color: AGENT_GREEN }}>
              Sign in
            </Link>
          </p>
          </div>

          {workspaceOpen && (region === 'AU' || region === 'NZ') ? (
            <div className={step === 2 ? undefined : 'hidden'}>
              <h2 className="text-2xl font-semibold tracking-tight">Set up your workspace</h2>
              <p className="mt-1 text-sm text-[#52647C]">
                Tell us a little about your agency. You can complete optional details later.
              </p>
              <RegisterWorkspaceStep
                region={region}
                onBack={() => setStep(1)}
                onContinue={() => setStep(3)}
              />
            </div>
          ) : null}

          {step === 3 ? <RegisterReadyStep pending={starting} onStart={() => void startTrip()} /> : null}
        </section>
      </main>
    </div>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-[#D45656]">{error}</p> : null}
    </div>
  );
}

function PasswordToggle({
  shown,
  onToggle,
  label = 'password',
}: {
  shown: boolean;
  onToggle: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute top-1/2 right-3 -translate-y-1/2 text-[#8AA0B5]"
      aria-label={shown ? `Hide ${label}` : `Show ${label}`}
    >
      {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof House;
  title: string;
  body: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#E2FAF1] text-[#00bd85]">
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-1.5 block text-sm leading-6 text-[#52647C]">{body}</span>
      </span>
    </li>
  );
}
