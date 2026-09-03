import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import { Suspense } from 'react';

import { AuthProvider } from '@/components/providers/auth-provider';
import { SystemAccessAgreementGate } from '@/components/auth/system-access-agreement-gate';
import { MustChangePasswordGate } from '@/components/auth/must-change-password-gate';
import { EmailVerificationGate } from '@/components/auth/email-verification-gate';
import { BillingBlockedGate } from '@/components/auth/billing-blocked-gate';
import { SalesAgreementGate } from '@/components/auth/sales-agreement-gate';
import { PortalServiceLevelGate } from '@/components/auth/portal-service-level-gate';
import { AgentDataProvider } from '@/components/providers/agent-data-provider';
import { AgentNotificationLiveAlert } from '@/components/agent/agent-notification-live-alert';
import { AgentNotificationDialogProvider } from '@/components/providers/agent-notification-dialog-provider';
import { ProviderErrorBoundary } from '@/components/providers/provider-error-boundary';
import { ChunkReloadGuard } from '@/components/providers/chunk-reload-guard';
import { StripEmojisGuard } from '@/components/providers/strip-emojis-guard';
import { ThemeProvider } from '@/components/theme-provider';
import { AddToHomeScreenPrompt } from '@/components/agent/add-to-home-screen-prompt';
import { EnvironmentBanner } from '@/components/agent/environment-banner';
import { WelcomeOnboarding } from '@/components/agent/welcome-onboarding';
import { AddPaymentMethodGate } from '@/components/agent/add-payment-method-gate';
import { AgentPageGuideHost } from '@/components/agent/agent-page-guide-host';
import { AgentPageTourHost } from '@/components/agent/agent-page-tour-host';
import { AgentPostLoginTasksTourRedirect } from '@/components/agent/agent-post-login-tasks-tour-redirect';
import { AgentPageGuideProvider } from '@/components/providers/agent-page-guide-provider';
import { AgentUiProvider } from '@/components/providers/agent-ui-provider';
import { ThemedToaster } from '@/components/ui/themed-toaster';
import { AGENT_UI } from '@/constants/agent-ui';
import { resolveAgentUi } from '@/lib/agent-ui';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'CROSSUB | Agent App',
  description:
    'Mobile-first agent portal — approvals, properties, inspections, maintenance, rent review, and vacating.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'CROSSUB Agent',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0f10' },
  ],
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const agentUi = resolveAgentUi(process.env.CROSSUB_AGENT_UI);

  return (
    <html
      lang="en"
      className="bg-background"
      data-ui={agentUi}
      suppressHydrationWarning
    >
      <head>
        <Script id="crossub-theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem('theme');var d=document.documentElement;if(t==='dark')d.classList.add('dark');else d.classList.remove('dark')}catch(e){}})();`}
        </Script>
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AgentUiProvider ui={agentUi}>
        {/*
          Outside every gate and provider, deliberately. The login page renders none of
          them, and the login page is where a wrong-host visit is mistaken for a wrong
          password — so a banner mounted inside the authenticated tree would be absent at
          the one moment it has to be read.
        */}
        <EnvironmentBanner />
        <ChunkReloadGuard />
        <StripEmojisGuard />
        <ThemeProvider>
          <AuthProvider>
            <ProviderErrorBoundary>
              <SystemAccessAgreementGate>
                <MustChangePasswordGate>
                  <EmailVerificationGate>
                  <BillingBlockedGate>
                    <SalesAgreementGate>
                    <AgentDataProvider>
                      <PortalServiceLevelGate>
                      <AgentNotificationDialogProvider>
                        <AgentPageGuideProvider>
                          <AgentNotificationLiveAlert />
                          <AddToHomeScreenPrompt />
                          {children}
                          <WelcomeOnboarding />
                          {agentUi === AGENT_UI.V2 ? (
                            <Suspense fallback={null}>
                              <AddPaymentMethodGate />
                            </Suspense>
                          ) : null}
          <Suspense fallback={null}>
            <AgentPageGuideHost />
          </Suspense>
          <Suspense fallback={null}>
            <AgentPostLoginTasksTourRedirect />
          </Suspense>
          <Suspense fallback={null}>
            <AgentPageTourHost />
          </Suspense>
                        </AgentPageGuideProvider>
                      </AgentNotificationDialogProvider>
                    </PortalServiceLevelGate>
                  </AgentDataProvider>
                    </SalesAgreementGate>
                  </BillingBlockedGate>
                  </EmailVerificationGate>
                </MustChangePasswordGate>
              </SystemAccessAgreementGate>
            </ProviderErrorBoundary>
          </AuthProvider>
          <ThemedToaster position="bottom-right" />
        </ThemeProvider>
        </AgentUiProvider>
      </body>
    </html>
  );
}
