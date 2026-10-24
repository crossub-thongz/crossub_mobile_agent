'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { api, ApiError } from '@/lib/api';
import { clearAddToHomeScreenDismissedForSession } from '@/lib/add-to-home-screen-state';
import { accountVerifiedForPortal } from '@/lib/email-verification';
import type { AuthUser } from '@/lib/auth-types';
import {
  clearLocalSession,
  clearOrphanLocalAccessCookie,
  getLocalSessionUser,
  hasLocalAccessCookie,
} from '@/lib/local-auth';

type AuthStatus = 'loading' | 'authed' | 'guest';

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  refresh: () => Promise<AuthStatus>;
  /** Mark the session signed in from a login response, without another `/auth/me` round trip. */
  adoptUser: (next: AuthUser) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
  emailsVerifiedWithoutMail = [],
}: {
  children: React.ReactNode;
  emailsVerifiedWithoutMail?: readonly string[];
}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const present = useCallback(
    (next: AuthUser) => accountVerifiedForPortal(next, emailsVerifiedWithoutMail),
    [emailsVerifiedWithoutMail],
  );

  const refresh = useCallback(async (): Promise<AuthStatus> => {
    clearOrphanLocalAccessCookie();

    try {
      const data = await api.get<{ user: AuthUser }>('/auth/me');
      setUser(present(data.user));
      setStatus('authed');
      return 'authed';
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        const localUser = getLocalSessionUser();
        if (localUser && hasLocalAccessCookie()) {
          setUser(present(localUser));
          setStatus('authed');
          return 'authed';
        }
        setUser(null);
        setStatus('guest');
        return 'guest';
      }
    }

    const localUser = getLocalSessionUser();
    if (localUser && hasLocalAccessCookie()) {
      setUser(present(localUser));
      setStatus('authed');
      return 'authed';
    }

    setUser(null);
    setStatus('guest');
    return 'guest';
  }, [present]);

  const adoptUser = useCallback((next: AuthUser) => {
    setUser(present(next));
    setStatus('authed');
  }, [present]);

  const logout = useCallback(async () => {
    clearLocalSession();
    clearAddToHomeScreenDismissedForSession();
    try {
      await api.post('/auth/logout');
    } catch {
      /* API may be offline */
    } finally {
      setUser(null);
      setStatus('guest');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, status, refresh, adoptUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
