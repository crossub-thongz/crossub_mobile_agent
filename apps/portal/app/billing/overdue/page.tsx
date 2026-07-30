'use client';

import { useEffect } from 'react';

import { ROUTES } from '@/constants/routes';

/** Legacy route — account lock pay flow now lives on Bill. */
export default function BillingOverdueRedirectPage() {
  useEffect(() => {
    window.location.replace(ROUTES.BILL);
  }, []);

  return null;
}
