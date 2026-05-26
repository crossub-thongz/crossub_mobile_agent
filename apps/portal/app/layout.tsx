import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import { AuthProvider } from '@/components/providers/auth-provider';
import { AgentDataProvider } from '@/components/providers/agent-data-provider';
import { ProviderErrorBoundary } from '@/components/providers/provider-error-boundary';
import { Toaster } from '@/components/ui/sonner';
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
  themeColor: '#0b0f10',
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark bg-background">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          <ProviderErrorBoundary>
            <AgentDataProvider>{children}</AgentDataProvider>
          </ProviderErrorBoundary>
        </AuthProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
