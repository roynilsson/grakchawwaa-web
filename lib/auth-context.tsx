// grakchawwaa-web/lib/auth-context.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, SessionData, ApiError } from './api';

interface AuthContextType {
  session: SessionData | null;
  loading: boolean;
  error: string | null;
  selectPlayer: (allyCode: string) => Promise<void>;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchSession = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await authApi.getSession();
      setSession(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setSession(null);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch session');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const selectPlayer = async (allyCode: string) => {
    try {
      await authApi.selectPlayer(allyCode);
      await fetchSession();
      router.push('/dashboard');
    } catch (err) {
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
      setSession(null);
      router.push('/');
    } catch (err) {
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        error,
        selectPlayer,
        logout,
        refetch: fetchSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
