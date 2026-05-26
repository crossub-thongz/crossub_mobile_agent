'use client';

import { Component, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';

export class ProviderErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[Agent portal] provider crash', error);
  }

  private clearLocalState = () => {
    try {
      localStorage.removeItem('crossub-agent-store');
    } catch {
      // ignore
    }
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm">
            The app hit an unexpected error while loading. Clearing saved data on
            this device often fixes it after an update.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={() => {
                this.clearLocalState();
                window.location.href = '/login';
              }}
            >
              Clear saved data & reload
            </Button>
            <Button
              variant="outline"
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
