'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type User = { id: string; email: string; name: string; permissions: string[] };

const AuthContext = createContext<{
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => void;
  hasPermission: (p: string) => boolean;
}>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) {
      setLoading(false);
      return;
    }
    setToken(t);
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => setUser(u))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || 'Login failed' };
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem('token', data.access_token);
    return {};
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  const hasPermission = (p: string) => (user?.permissions?.includes(p) ?? false);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
