import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '@/lib/api';

type User = {
  id: number;
  name: string;
  email: string;
  phone_number: string;
  is_admin: boolean;
};

type AuthState = {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { name: string; email: string; phone_number: string; password: string }) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (payload: { name: string; email: string; phone_number: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const STORAGE_TOKEN = 'glycosense.token';
const STORAGE_USER = 'glycosense.user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(STORAGE_TOKEN),
          AsyncStorage.getItem(STORAGE_USER),
        ]);
        if (storedToken) setToken(storedToken);
        if (storedUser) setUser(JSON.parse(storedUser));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const persist = async (nextToken: string | null, nextUser: User | null) => {
    if (nextToken) await AsyncStorage.setItem(STORAGE_TOKEN, nextToken);
    else await AsyncStorage.removeItem(STORAGE_TOKEN);
    if (nextUser) await AsyncStorage.setItem(STORAGE_USER, JSON.stringify(nextUser));
    else await AsyncStorage.removeItem(STORAGE_USER);
  };

  const login = async (email: string, password: string) => {
    const result = await apiFetch<{ access_token: string; user: User }>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(result.access_token);
    setUser(result.user);
    await persist(result.access_token, result.user);
  };

  const register = async (payload: { name: string; email: string; phone_number: string; password: string }) => {
    await apiFetch('/register', { method: 'POST', body: JSON.stringify(payload) });
    await login(payload.email, payload.password);
  };

  const refreshProfile = async () => {
    if (!token) return;
    const me = await apiFetch<User>('/me', { token });
    setUser(me);
    await persist(token, me);
  };

  const updateProfile = async (payload: { name: string; email: string; phone_number: string }) => {
    if (!token) return;
    const me = await apiFetch<User>('/me', {
      method: 'PUT',
      token,
      body: JSON.stringify(payload),
    });
    setUser(me);
    await persist(token, me);
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await persist(null, null);
  };

  const value = useMemo<AuthState>(
    () => ({
      token,
      user,
      loading,
      login,
      register,
      refreshProfile,
      updateProfile,
      logout,
    }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
