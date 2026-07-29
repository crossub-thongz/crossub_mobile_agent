import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import { Suspense } from 'react';

import { AuthProvider } from '@/components/providers/auth-provider';
import { SystemAccessAgreementGate } from '@/components/auth/system-access-agreement-gate';
import { MustChangePasswordGate } from '@/components/auth/must-change-password-gate';
import { PortalServiceLevelGate } from '@/components/auth/portal-service-level-gate';
import { AgentDataProvider } from '@/components/providers/agent-data-provider';
import { AgentNotificationLiveAlert } from '@/components/agent/agent-notification-live-alert';
import { AgentNotificationDialogProvider } from '@/components/providers/agent-notification-dialog-provider';
import { ProviderErrorBoundary } from '@/components/providers/provider-error-boundary';
import { ChunkReloadGuard } from '@/components/providers/chunk-reload-guard';
import { ThemeProvider } from '@/components/theme-provider';
import { AddToHomeScreenPrompt } from '@/components/agent/add-to-home-screen-prompt';
import { WelcomeOnboarding } from '@/components/agent/welcome-onboarding';
import { AgentPageGuideHost } from '@/components/agent/agent-page-guide-host';
import { ThemedToaster } from '@/components/ui/themed-toaster';
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
  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <head>
        <Script id="crossub-theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem('theme');var d=document.documentElement;if(t==='dark')d.classList.add('dark');else d.classList.remove('dark')}catch(e){}})();`}
        </Script>
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ChunkReloadGuard />
        <ThemeProvider>
          <AuthProvider>
            <ProviderErrorBoundary>
              <SystemAccessAgreementGate>
                <MustChangePasswordGate>
                  <AgentDataProvider>
                    <PortalServiceLevelGate>
                      <AgentNotificationDialogProvider>
                        <AgentNotificationLiveAlert />
                        <AddToHomeScreenPrompt />
                        {children}
                        <WelcomeOnboarding />
                        <Suspense fallback={null}>
                          <AgentPageGuideHost />
                        </Suspense>
                      </AgentNotificationDialogProvider>
                    </PortalServiceLevelGate>
                  </AgentDataProvider>
                </MustChangePasswordGate>
              </SystemAccessAgreementGate>
            </ProviderErrorBoundary>
          </AuthProvider>
          <ThemedToaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
