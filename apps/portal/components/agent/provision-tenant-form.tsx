'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Copy, Eye, EyeOff, Loader2, RefreshCw, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/providers/auth-provider';
import { ROUTES } from '@/constants/routes';
import { canProvisionTenant, provisionTenantBlockReason } from '@/lib/can-provision-tenant';
import { generateTenantPassword } from '@/lib/generate-tenant-password';
import { provisionTenantAccount, type ProvisionedTenant } from '@/lib/tenant-provisioning';
import type { TenantProvisionPrefill } from '@/lib/tenant-provision-prefill';

import { tenantAppBaseUrl } from '@/lib/tenant-app-url';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export interface ProvisionedTenantCredentials extends FormValues {
  password: string;
}

export interface ProvisionTenantSuccessPayload {
  credentials: ProvisionedTenantCredentials;
  provisioned: ProvisionedTenant;
}

export function ProvisionTenantForm({
  prefill,
  applicationId,
  onSuccess,
}: {
  prefill: TenantProvisionPrefill;
  /** Rental application id — links login to applicant Person and starts onboarding. */
  applicationId?: string;
  onSuccess: (payload: ProvisionTenantSuccessPayload) => void;
}) {
  const { user } = useAuth();
  const provisionBlockReason = provisionTenantBlockReason(user);
  const canProvision = canProvisionTenant(user);
  const [password, setPassword] = useState(() => generateTenantPassword());
  const [showPassword, setShowPassword] = useState(false);
  const emailFromApplication = Boolean(prefill.applicationLabel && prefill.email);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: prefill.email,
      firstName: prefill.firstName,
      lastName: prefill.lastName,
      phone: prefill.phone,
    },
  });

  useEffect(() => {
    form.reset({
      email: prefill.email,
      firstName: prefill.firstName,
      lastName: prefill.lastName,
      phone: prefill.phone,
    });
  }, [form, prefill]);

  const regeneratePassword = () => {
    setPassword(generateTenantPassword());
    toast.message('New password generated');
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password);
      toast.success('Password copied');
    } catch {
      toast.error('Could not copy password');
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const provisioned = await provisionTenantAccount({
        email: values.email,
        password,
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone || undefined,
        ...(applicationId ? { applicationId } : {}),
      });
      onSuccess({ credentials: { ...values, password }, provisioned });
      toast.success('Tenant account created');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Tenant provisioning failed.';
      toast.error(message);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {provisionBlockReason ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <p className="font-medium">Cannot create tenant accounts</p>
          <p className="mt-1">{provisionBlockReason}</p>
          <Link href={ROUTES.LOGIN} className="mt-2 inline-block font-medium underline">
            Sign in with a different account
          </Link>
        </div>
      ) : null}

      {prefill.applicationLabel ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
          <p className="text-primary font-medium">From tenant application</p>
          <p className="text-muted-foreground mt-0.5">
            Email and name are prefilled from <strong>{prefill.applicationLabel}</strong>&apos;s
            application. A login password will be generated for you to share securely.
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Create a tenant login for the <strong>CROSSUB Tenant App</strong>. The system generates a
          secure password — share it with the tenant after creation.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" inputKind="person_name" {...form.register('firstName')} />
          {form.formState.errors.firstName ? (
            <p className="text-xs text-destructive">{form.formState.errors.firstName.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" inputKind="person_name" {...form.register('lastName')} />
          {form.formState.errors.lastName ? (
            <p className="text-xs text-destructive">{form.formState.errors.lastName.message}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email (username)</Label>
        <Input
          id="email"
          type="email"
          readOnly={emailFromApplication}
          className={emailFromApplication ? 'bg-muted/50' : undefined}
          {...form.register('email')}
        />
        {form.formState.errors.email ? (
          <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input id="phone" type="tel" {...form.register('phone')} />
      </div>

      <div className="space-y-2">
        <Label>Generated password</Label>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Input
              readOnly
              type={showPassword ? 'text' : 'password'}
              value={password}
              className="bg-muted/50 pr-10 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 hover:text-foreground"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <Button type="button" variant="outline" size="icon" onClick={copyPassword} aria-label="Copy password">
            <Copy className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={regeneratePassword}
            aria-label="Regenerate password"
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          Regenerate if needed. The same password is used when you create the account.
        </p>
      </div>

      <Button type="submit" disabled={form.formState.isSubmitting || !canProvision} className="w-full">
        {form.formState.isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Creating tenant account...
          </>
        ) : (
          <>
            Create tenant account <UserPlus className="size-4" />
          </>
        )}
      </Button>
    </form>
  );
}

export function ProvisionTenantSuccess({
  credentials,
  onCreateAnother,
}: {
  credentials: ProvisionedTenantCredentials;
  onCreateAnother: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);

  const copyAll = async () => {
    const text = [
      `Tenant app login`,
      `Email: ${credentials.email}`,
      `Password: ${credentials.password}`,
      `Sign in: ${tenantAppBaseUrl()}/login`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Credentials copied');
    } catch {
      toast.error('Could not copy credentials');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-primary text-xs font-semibold uppercase">Tenant registered</p>
        <h2 className="mt-1 text-lg font-semibold">Share these credentials</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          The tenant can sign in to track leasing onboarding and confirm key collection. Share
          credentials securely below.
        </p>
      </div>

      <dl className="space-y-3 rounded-xl border bg-muted/40 p-4 text-sm">
        <div>
          <dt className="text-muted-foreground text-xs">Tenant name</dt>
          <dd className="font-medium">
            {credentials.firstName} {credentials.lastName}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Username (email)</dt>
          <dd className="font-medium">{credentials.email}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Password</dt>
          <dd className="mt-1 flex items-center gap-2">
            <span className="font-mono font-medium">
              {showPassword ? credentials.password : '•'.repeat(Math.min(credentials.password.length, 12))}
            </span>
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2">
        <Button onClick={() => void copyAll()}>Copy credentials</Button>
        <Button variant="outline" asChild>
          <a href={`${tenantAppBaseUrl()}/login`} target="_blank" rel="noopener noreferrer">
            Open tenant app sign-in
          </a>
        </Button>
        <Button variant="outline" asChild>
          <Link href={ROUTES.TENANTS}>View tenant accounts</Link>
        </Button>
        <Button variant="outline" onClick={onCreateAnother}>
          Create another tenant
        </Button>
      </div>
    </div>
  );
}
