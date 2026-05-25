'use client';

import Link from 'next/link';
import { Building2, KeyRound, Wrench } from 'lucide-react';

import { AgentShell } from '@/components/layout/agent-shell';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/components/providers/auth-provider';
import { ROUTES } from '@/constants/routes';
import { displayName } from '@/lib/utils';

const MODULES = [
  {
    href: ROUTES.MAINTENANCE,
    title: 'Maintenance',
    description: 'Submit and track maintenance requests for your listings.',
    icon: Wrench,
    status: 'Live API',
  },
  {
    href: ROUTES.KEYS,
    title: 'Key handover',
    description: 'Coordinate key collection and return with property managers.',
    icon: KeyRound,
    status: 'Coming soon',
  },
  {
    href: ROUTES.VIEWINGS,
    title: 'Open viewings',
    description: 'Schedule and manage open inspections for your properties.',
    icon: Building2,
    status: 'Coming soon',
  },
] as const;

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <AgentShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome{user ? `, ${displayName(user)}` : ''}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage maintenance, keys, and viewings for your property portfolio.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map(({ href, title, description, icon: Icon, status }) => (
            <Link key={href} href={href} className="group block">
              <Card className="h-full transition-colors group-hover:border-primary/40">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </div>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                      {status}
                    </span>
                  </div>
                  <CardTitle className="text-base">{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

      </div>
    </AgentShell>
  );
}
