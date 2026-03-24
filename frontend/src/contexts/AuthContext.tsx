import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, tokenStorage } from '@/lib/api';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Avoid double-fetch in React StrictMode
  const initialized = useRef(false);

  const fetchMe = useCallback(async () => {
    const { data } = await api.get<{ data: { user: User } }>('/auth/me');
    setState({ user: data.data.user, isAuthenticated: true, isLoading: false });
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const token = tokenStorage.getAccess();
    if (!token) {
      setState({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    fetchMe().catch(() => {
      tokenStorage.clear();
      setState({ user: null, isAuthenticated: false, isLoading: false });
    });
  }, [fetchMe]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<{
      data: { user: User; accessToken: string; refreshToken: string };
    }>('/auth/login', { email, password });
    tokenStorage.set(data.data.accessToken, data.data.refreshToken);
    setState({ user: data.data.user, isAuthenticated: true, isLoading: false });
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore — clear locally regardless
    } finally {
      tokenStorage.clear();
      setState({ user: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  const refreshUser = useCallback(async () => {
    await fetchMe();
  }, [fetchMe]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
