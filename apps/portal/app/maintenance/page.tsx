'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { AgentShell } from '@/components/layout/agent-shell';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ApiError, api } from '@/lib/api';

interface MaintenanceRequest {
  id: string;
  title: string;
  status: string;
  priority?: string;
  propertyAddress?: string;
}

interface MaintenanceState {
  requests?: MaintenanceRequest[];
}

export default function MaintenancePage() {
  const [state, setState] = useState<MaintenanceState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await api.get<MaintenanceState>('/maintenance/state');
        if (!cancelled) {
          setState(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError) {
            setError(`Unable to load maintenance data (${err.status}).`);
          } else {
            setError('Unable to load maintenance data.');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const requests = state?.requests ?? [];

  return (
    <AgentShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Maintenance</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            View maintenance requests linked to your listings. Submissions use
            the crossub_web maintenance API.
          </p>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading requests...
          </div>
        )}

        {error && (
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-base text-destructive">Error</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Ensure crossub_web API is running on port 3001 and you are signed
              in with a valid account.
            </CardContent>
          </Card>
        )}

        {!loading && !error && requests.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">No requests yet</CardTitle>
              <CardDescription>
                Maintenance requests will appear here once submitted or synced
                from the API.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {!loading && requests.length > 0 && (
          <div className="space-y-3">
            {requests.map((req) => (
              <Card key={req.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle className="text-base">{req.title}</CardTitle>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize text-muted-foreground">
                      {req.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {req.propertyAddress && (
                    <CardDescription>{req.propertyAddress}</CardDescription>
                  )}
                </CardHeader>
                {req.priority && (
                  <CardContent className="pt-0 text-xs text-muted-foreground">
                    Priority: {req.priority}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AgentShell>
  );
}
