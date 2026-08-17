'use client';

/**
 * Previously redirected agents to /agreements until Sales approved the service
 * agreement. Retired Aug 2026 so Sales-created accounts can use the app immediately.
 */
export function SalesAgreementGate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
