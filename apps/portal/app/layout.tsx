import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';

import { AuthProvider } from '@/components/providers/auth-provider';
import { SystemAccessAgreementGate } from '@/components/auth/system-access-agreement-gate';
import { PortalServiceLevelGate } from '@/components/auth/portal-service-level-gate';
import { AgentDataProvider } from '@/components/providers/agent-data-provider';
import { AgentNotificationLiveAlert } from '@/components/agent/agent-notification-live-alert';
import { ProviderErrorBoundary } from '@/components/providers/provider-error-boundary';
import { ThemeProvider } from '@/components/theme-provider';
import { WelcomeOnboarding } from '@/components/agent/welcome-onboarding';
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
        <ThemeProvider>
          <AuthProvider>
            <ProviderErrorBoundary>
              <SystemAccessAgreementGate>
                <AgentDataProvider>
                  <PortalServiceLevelGate>
                    <AgentNotificationLiveAlert />
                    {children}
                    <WelcomeOnboarding />
                  </PortalServiceLevelGate>
                </AgentDataProvider>
              </SystemAccessAgreementGate>
            </ProviderErrorBoundary>
          </AuthProvider>
          <ThemedToaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
