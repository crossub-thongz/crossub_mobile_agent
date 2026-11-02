'use client';

import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';

/** Signs out first. A plain link back to /login is sent to the dashboard, then back here. */
export function BackToSignInButton() {
  const { logout } = useAuth();
  const [leaving, setLeaving] = useState(false);

  return (
    <button
      type="button"
      disabled={leaving}
      onClick={() => {
        setLeaving(true);
        void logout();
      }}
      className="inline-flex items-center gap-1 text-sm text-[#52647C] disabled:opacity-50"
    >
      <ArrowLeft className="size-4" />
      Back to sign in
    </button>
  );
}
