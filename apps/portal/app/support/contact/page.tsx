'use client';

import { Suspense } from 'react';

import { ContactSupportHub } from '@/components/agent/contact-support-hub';
import { AgentShell } from '@/components/layout/agent-shell';
import { ROUTES } from '@/constants/routes';

function ContactSupportPageContent() {
  return (
    <AgentShell title="Contact CROSSUB support" backHref={ROUTES.SUPPORT} backLabel="Support">
      <ContactSupportHub />
    </AgentShell>
  );
}

export default function ContactSupportPage() {
  return (
    <Suspense fallback={null}>
      <ContactSupportPageContent />
    </Suspense>
  );
}
