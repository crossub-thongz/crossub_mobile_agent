'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { ROUTES } from '@/constants/routes';

/** Text curriculum replaced by interactive workflow demo tours. */
export default function AgentWorkflowTrainingRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(ROUTES.SUPPORT_WORKFLOW_TOURS);
  }, [router]);

  return null;
}
