'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
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
import { ApiError } from '@/lib/api';

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
});

type AgentValues = z.infer<typeof agentSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

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

  const isSubmitting = agentForm.formState.isSubmitting;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="mb-8 flex flex-col items-center gap-2">
        <CrossubLogo size="lg" showTagline />
        <p className="text-muted-foreground text-sm">Agent registration</p>
      </div>

      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-lg">
        <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
          For registration details, please contact the <strong>Leasing Team</strong>. After
          registration you will have a username (email) and password to sign in.
        </div>

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
