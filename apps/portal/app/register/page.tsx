'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Phone,
  User,
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
import { buildProvisionedTenantRecord } from '@/lib/provisioned-tenant-records';
import { postAuthDestination } from '@/lib/system-access-agreement';
import { useAgentStore } from '@/lib/store';
import { provisionTenantAccount } from '@/lib/tenant-provisioning';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

const credentialsSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(PASSWORD_MIN, `Min ${PASSWORD_MIN} characters`)
    .max(PASSWORD_MAX),
});

const agentSchema = credentialsSchema.extend({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  agencyName: z.string().min(1, 'Agency name is required'),
  agencyCompany: z.string().optional(),
  phone: z.string().optional(),
});

const tenantSchema = credentialsSchema.extend({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
});

type AgentValues = z.infer<typeof agentSchema>;
type TenantValues = z.infer<typeof tenantSchema>;
type RegisterMode = 'agent' | 'tenant';

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [mode, setMode] = useState<RegisterMode>('agent');
  const [showPassword, setShowPassword] = useState(false);
  const [tenantCredentials, setTenantCredentials] = useState<TenantValues | null>(null);

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
    },
  });

  const tenantForm = useForm<TenantValues>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
    },
  });

  const onAgentRegister = async (values: AgentValues) => {
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
      });
      await refresh();
      toast.success(
        'Agent account created — your agency is in crossub_web Clients and you are signed in.',
      );
      router.replace(
        postAuthDestination(user, ROUTES.DASHBOARD, ROUTES.SYSTEM_ACCESS_AGREEMENT),
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

  const onTenantRegister = async (values: TenantValues) => {
    try {
      const provisioned = await provisionTenantAccount({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
      });
      useAgentStore.getState().addProvisionedTenant(
        buildProvisionedTenantRecord({
          provisioned,
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone,
          password: values.password,
        }),
      );
      setTenantCredentials(values);
      tenantForm.reset();
      toast.success('Tenant account created — share credentials with the tenant.');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Tenant registration failed.';
      toast.error(message);
    }
  };

  const isSubmitting =
    mode === 'agent'
      ? agentForm.formState.isSubmitting
      : tenantForm.formState.isSubmitting;

  if (tenantCredentials) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-lg">
          <p className="text-primary text-xs font-semibold uppercase">Tenant registered</p>
          <h1 className="mt-1 text-xl font-semibold">Share these credentials</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            The tenant can now sign in to the <strong>CROSSUB Tenant App</strong> using the
            username and password below.
          </p>
          <dl className="mt-4 space-y-3 rounded-lg border bg-muted/40 p-4 text-sm">
            <div>
              <dt className="text-muted-foreground text-xs">Username (email)</dt>
              <dd className="font-medium">{tenantCredentials.email}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Password</dt>
              <dd className="font-mono font-medium">{tenantCredentials.password}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Tenant name</dt>
              <dd className="font-medium">
                {tenantCredentials.firstName} {tenantCredentials.lastName}
              </dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-col gap-2">
            <Button onClick={() => setTenantCredentials(null)}>Register another tenant</Button>
            <Button variant="outline" asChild>
              <Link href={ROUTES.DASHBOARD}>Back to portal</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="mb-8 flex flex-col items-center gap-2">
        <CrossubLogo size="lg" showTagline />
        <p className="text-muted-foreground text-sm">First-time registration</p>
      </div>

      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-lg">
        <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
          For registration details, please contact the <strong>Leasing Team</strong>. After
          registration you will have a username (email) and password to sign in.
        </div>

        <div className="bg-muted mb-6 flex rounded-lg p-1">
          <button
            type="button"
            onClick={() => setMode('agent')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors',
              mode === 'agent'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground',
            )}
          >
            <KeyRound className="size-4" />
            Agent
          </button>
          <button
            type="button"
            onClick={() => setMode('tenant')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors',
              mode === 'tenant'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground',
            )}
          >
            <UserPlus className="size-4" />
            Tenant
          </button>
        </div>

        {mode === 'agent' ? (
          <form onSubmit={agentForm.handleSubmit(onAgentRegister)} className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Register as a listing agent. Your agency name and company are saved to crossub_web
              Clients; properties you add later use the same registry database.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" {...agentForm.register('firstName')} />
                {agentForm.formState.errors.firstName && (
                  <p className="text-xs text-destructive">
                    {agentForm.formState.errors.firstName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" {...agentForm.register('lastName')} />
                {agentForm.formState.errors.lastName && (
                  <p className="text-xs text-destructive">
                    {agentForm.formState.errors.lastName.message}
                  </p>
                )}
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
                  {agentForm.formState.errors.agencyName && (
                    <p className="text-xs text-destructive">
                      {agentForm.formState.errors.agencyName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agencyCompany">Company</Label>
                  <Input
                    id="agencyCompany"
                    placeholder="e.g. Skyline Realty Pty Ltd"
                    {...agentForm.register('agencyCompany')}
                  />
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
              {agentForm.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {agentForm.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <div className="relative">
                <Phone className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="phone" type="tel" className="pl-10" {...agentForm.register('phone')} />
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
              {agentForm.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {agentForm.formState.errors.password.message}
                </p>
              )}
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full">
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
          </form>
        ) : (
          <form onSubmit={tenantForm.handleSubmit(onTenantRegister)} className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Register a tenant account for the <strong>Tenant App</strong>. Tenants cannot
              self-register — they must be registered here first, then sign in with these
              credentials.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="tenant-firstName">First name</Label>
                <div className="relative">
                  <User className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="tenant-firstName"
                    className="pl-10"
                    {...tenantForm.register('firstName')}
                  />
                </div>
                {tenantForm.formState.errors.firstName && (
                  <p className="text-xs text-destructive">
                    {tenantForm.formState.errors.firstName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant-lastName">Last name</Label>
                <Input id="tenant-lastName" {...tenantForm.register('lastName')} />
                {tenantForm.formState.errors.lastName && (
                  <p className="text-xs text-destructive">
                    {tenantForm.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-email">Email (username)</Label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="tenant-email"
                  type="email"
                  className="pl-10"
                  placeholder="tenant@email.com"
                  {...tenantForm.register('email')}
                />
              </div>
              {tenantForm.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {tenantForm.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-phone">Phone (optional)</Label>
              <Input id="tenant-phone" type="tel" {...tenantForm.register('phone')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-password">Password</Label>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="tenant-password"
                  type={showPassword ? 'text' : 'password'}
                  className="pl-10 pr-10"
                  placeholder={`At least ${PASSWORD_MIN} characters`}
                  {...tenantForm.register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {tenantForm.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {tenantForm.formState.errors.password.message}
                </p>
              )}
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Creating tenant account...
                </>
              ) : (
                <>
                  Register tenant <UserPlus className="size-4" />
                </>
              )}
            </Button>
          </form>
        )}

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
