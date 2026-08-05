'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/components/providers/auth-provider';
import {
  EMAIL_VERIFICATION_BLOCK_MESSAGE,
  needsEmailVerification,
} from '@/lib/email-verification';

export function useEmailVerificationGuard() {
  const { user } = useAuth();
  const unverified = needsEmailVerification(user);

  const blockIfUnverified = useCallback(
    (message?: string): boolean => {
      if (!unverified) return false;
      toast.error(message ?? EMAIL_VERIFICATION_BLOCK_MESSAGE);
      return true;
    },
    [unverified],
  );

  return {
    needsEmailVerification: unverified,
    blockIfUnverified,
  };
}
