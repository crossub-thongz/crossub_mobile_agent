'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  UserPlus,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useAuth } from '@/components/providers/auth-provider';
import { CrossubLogo } from '@/components/brand/crossub-logo';
import { AddressLineAutocomplete } from '@/components/end-leasing/address-line-autocomplete';
import { RegisterPricingPanel } from '@/components/register/register-pricing-panel';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PASSWORD_MAX, PASSWORD_MIN } from '@/constants/auth';
import { ROUTES } from '@/constants/routes';
import {
  registerAgentAccount,
  registerAgentErrorMessage,
} from '@/lib/agent-registration';
import { registerLocalAccount } from '@/lib/local-auth';
import { postAuthDestination } from '@/lib/system-access-agreement';
import {
  DEFAULT_PORTAL_SERVICE_LEVEL,
  REGISTER_SERVICE_LEVEL_LABEL,
  type AgentPortalServiceLevel,
} from '@/lib/portal-service-level';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

const STEPS = ['Your details', 'Service & pricing', 'Confirm'] as const;
type RegisterStep = (typeof STEPS)[number];

const agentSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(PASSWORD_MIN, `Min ${PASSWORD_MIN} characters`)
    .max(PASSWORD_MAX),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  agencyName: z.string().min(1, 'Agency name is required'),
  agencyCompany: z.string().optional(),
  phone: z.string().optional(),
  abn: z.string().optional(),
  licenceNumber: z.string().optional(),
  officeAddress: z.string().optional(),
});

type AgentValues = z.infer<typeof agentSchema>;

function StepIndicator({ current }: { current: RegisterStep }) {
  const index = STEPS.indexOf(current);
  return (
    <ol className="mb-6 flex items-center gap-2">
      {STEPS.map((step, i) => (
        <li key={step} className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className={cn(
              'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
              i <= index
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {i + 1}
          </span>
          <span
            className={cn(
              'hidden truncate text-xs font-medium sm:inline',
              i === index ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {step}
          </span>
          {i < STEPS.length - 1 ? (
            <span className="bg-border hidden h-px flex-1 sm:block" />
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [step, setStep] = useState<RegisterStep>('Your details');
  const [showPassword, setShowPassword] = useState(false);
  const [portalServiceLevel, setPortalServiceLevel] =
    useState<AgentPortalServiceLevel | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const agentForm = useForm<AgentValues>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      agencyName: '',
      agencyCompany: '',
      phone: '',
      abn: '',
      licenceNumber: '',
      officeAddress: '',
    },
  });

  const goToServiceStep = async () => {
    const valid = await agentForm.trigger([
      'firstName',
      'lastName',
      'agencyName',
      'email',
      'password',
    ]);
    if (!valid) return;
    setStep('Service & pricing');
  };

  const goToConfirmStep = () => {
    if (!portalServiceLevel) {
      toast.error('Please select Inspection Only Service or Full Service.');
      return;
    }
    setStep('Confirm');
  };

  const onAgentRegister = async (values: AgentValues) => {
    if (!portalServiceLevel) {
      toast.error('Please select a service plan.');
      setStep('Service & pricing');
      return;
    }
    if (!acceptTerms) {
      toast.error('Please accept the terms and conditions to continue.');
      return;
    }

    let apiUnreachable = false;

    try {
      const user = await registerAgentAccount({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        agencyName: values.agencyName,
        agencyCompany: values.agencyCompany,
        phone: values.phone,
        abn: values.abn,
        licenceNumber: values.licenceNumber,
        officeAddress: values.officeAddress,
        portalServiceLevel,
        acceptTerms: true,
      });
      await refresh();
      toast.success('Account created — check your email to verify your address.');
      router.replace(
        postAuthDestination(
          user,
          ROUTES.DASHBOARD,
          ROUTES.SYSTEM_ACCESS_AGREEMENT,
          ROUTES.CHANGE_PASSWORD,
        ),
      );
      return;
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          toast.error(registerAgentErrorMessage(err));
          return;
        }
        if (err.status >= 500 || err.status === 0) {
          apiUnreachable = true;
        } else {
          toast.error(registerAgentErrorMessage(err));
          return;
        }
      } else {
        apiUnreachable = true;
      }
    }

    if (apiUnreachable) {
      try {
        registerLocalAccount({
          email: values.email,
          password: values.password,
          firstName: values.firstName,
          lastName: values.lastName,
          agencyName: values.agencyName,
          agencyCompany: values.agencyCompany,
          phone: values.phone,
        });
        await refresh();
        toast.warning(
          'Signed in offline only — start the API (pnpm dev:api) to sync your agency to crossub_web.',
        );
        router.replace(ROUTES.DASHBOARD);
        return;
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Registration failed.';
        toast.error(message);
        return;
      }
    }

    toast.error('Registration failed.');
  };

  const isSubmitting = agentForm.formState.isSubmitting;
  const selectedLevel = portalServiceLevel ?? DEFAULT_PORTAL_SERVICE_LEVEL;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="mb-8 flex flex-col items-center gap-2">
        <CrossubLogo size="lg" showTagline />
        <p className="text-muted-foreground text-sm">Agent registration</p>
      </div>

      <div
        className={cn(
          'w-full rounded-xl border bg-card p-6 shadow-lg sm:p-8',
          step === 'Service & pricing' ? 'max-w-3xl' : 'max-w-lg',
        )}
      >
        <StepIndicator current={step} />

        {step === 'Your details' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void goToServiceStep();
            }}
            className="space-y-4"
          >
            <p className="text-muted-foreground text-sm leading-relaxed">
              Create your agent account. Your email is your username — we&apos;ll send a
              verification link after signup. On first login, a user guide walks you through
              the platform.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" {...agentForm.register('firstName')} />
                {agentForm.formState.errors.firstName ? (
                  <p className="text-xs text-destructive">
                    {agentForm.formState.errors.firstName.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" {...agentForm.register('lastName')} />
                {agentForm.formState.errors.lastName ? (
                  <p className="text-xs text-destructive">
                    {agentForm.formState.errors.lastName.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-secondary/20 p-3">
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Agency details
              </p>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="agencyName">Agency name</Label>
                  <Input
                    id="agencyName"
                    placeholder="e.g. Skyline Realty"
                    {...agentForm.register('agencyName')}
                  />
                  {agentForm.formState.errors.agencyName ? (
                    <p className="text-xs text-destructive">
                      {agentForm.formState.errors.agencyName.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agencyCompany">Company (legal name)</Label>
                  <Input
                    id="agencyCompany"
                    placeholder="e.g. Skyline Realty Pty Ltd"
                    {...agentForm.register('agencyCompany')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="abn">ABN</Label>
                    <Input id="abn" placeholder="Optional" {...agentForm.register('abn')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="licenceNumber">Licence no.</Label>
                    <Input
                      id="licenceNumber"
                      placeholder="Optional"
                      {...agentForm.register('licenceNumber')}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="officeAddress">Office address</Label>
                  <AddressLineAutocomplete
                    id="officeAddress"
                    value={agentForm.watch('officeAddress') ?? ''}
                    onChange={(value) =>
                      agentForm.setValue('officeAddress', value, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    placeholder="Search agency office address"
                  />
                  <p className="text-muted-foreground text-xs">
                    Start typing to search — the formatted address is saved when you pick a result.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (username)</Label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  className="pl-10"
                  placeholder="you@agency.com"
                  {...agentForm.register('email')}
                />
              </div>
              {agentForm.formState.errors.email ? (
                <p className="text-xs text-destructive">
                  {agentForm.formState.errors.email.message}
                </p>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Used to sign in. Email verification is required before full access.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Mobile</Label>
              <div className="relative">
                <Phone className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  className="pl-10"
                  placeholder="Optional"
                  {...agentForm.register('phone')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="pl-10 pr-10"
                  placeholder={`At least ${PASSWORD_MIN} characters`}
                  {...agentForm.register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {agentForm.formState.errors.password ? (
                <p className="text-xs text-destructive">
                  {agentForm.formState.errors.password.message}
                </p>
              ) : null}
            </div>

            <Button type="submit" className="w-full">
              Continue to pricing <ArrowRight className="size-4" />
            </Button>
          </form>
        ) : null}

        {step === 'Service & pricing' ? (
          <div className="space-y-4">
            <RegisterPricingPanel
              selectedLevel={portalServiceLevel}
              onSelectLevel={setPortalServiceLevel}
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep('Your details')}>
                <ArrowLeft className="size-4" /> Back
              </Button>
              <Button type="button" className="flex-1" onClick={goToConfirmStep}>
                Continue <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}

        {step === 'Confirm' ? (
          <form
            onSubmit={agentForm.handleSubmit(onAgentRegister)}
            className="space-y-4"
          >
            <div className="rounded-lg border bg-secondary/20 p-4 text-sm">
              <p className="font-medium">{agentForm.watch('firstName')} {agentForm.watch('lastName')}</p>
              <p className="text-muted-foreground">{agentForm.watch('email')}</p>
              <p className="text-muted-foreground mt-2">{agentForm.watch('agencyName')}</p>
              {agentForm.watch('agencyCompany') ? (
                <p className="text-muted-foreground text-xs">{agentForm.watch('agencyCompany')}</p>
              ) : null}
              <p className="mt-3 text-sm font-medium">
                {REGISTER_SERVICE_LEVEL_LABEL[selectedLevel]}
              </p>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm leading-relaxed">
              <p className="font-medium text-foreground">Terms &amp; system access agreement</p>
              <p className="text-muted-foreground mt-2">
                By registering you agree to the CROSSUB terms of service, privacy policy, and the
                system access agreement governing use of the agent portal.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="acceptTerms"
                className="mt-1 size-4 rounded border-border"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
              />
              <Label htmlFor="acceptTerms" className="text-sm leading-snug">
                I accept the CROSSUB terms &amp; conditions and system access agreement
              </Label>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('Service & pricing')}
              >
                <ArrowLeft className="size-4" /> Back
              </Button>
              <Button type="submit" disabled={!acceptTerms || isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Creating account...
                  </>
                ) : (
                  <>
                    Create agent account <UserPlus className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : null}

        <p className="text-muted-foreground mt-6 text-center text-sm">
          Already registered?{' '}
          <Link href={ROUTES.LOGIN} className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
