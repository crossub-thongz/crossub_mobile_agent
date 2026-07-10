'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Inner class boundary — kept separate so the named export stays a stable function wrapper. */
class ProviderErrorBoundaryInner extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      '[Agent portal] provider crash',
      error?.message ?? error,
      info?.componentStack,
    );
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
          <p className="text-destructive mt-3 max-w-md font-mono text-[11px] break-words">
            {this.state.error.message}
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

/** Function export avoids Turbopack HMR treating the class export as a non-component. */
export function ProviderErrorBoundary({ children }: Props) {
  return <ProviderErrorBoundaryInner>{children}</ProviderErrorBoundaryInner>;
}
