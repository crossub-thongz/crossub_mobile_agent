'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { api, ApiError } from '@/lib/api';
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
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const refresh = useCallback(async () => {
    clearOrphanLocalAccessCookie();

    try {
      const data = await api.get<{ user: AuthUser }>('/auth/me');
      setUser(data.user);
      setStatus('authed');
      return;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        const localUser = getLocalSessionUser();
        if (localUser && hasLocalAccessCookie()) {
          setUser(localUser);
          setStatus('authed');
          return;
        }
        setUser(null);
        setStatus('guest');
        return;
      }
    }

    const localUser = getLocalSessionUser();
    if (localUser && hasLocalAccessCookie()) {
      setUser(localUser);
      setStatus('authed');
      return;
    }

    setUser(null);
    setStatus('guest');
  }, []);

  const logout = useCallback(async () => {
    clearLocalSession();
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
    <AuthContext.Provider value={{ user, status, refresh, logout }}>
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
