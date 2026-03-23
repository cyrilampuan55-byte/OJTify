import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  target_hours: number;
}

export interface UserSettings {
  excluded_days: string[];
  target_end_date: string | null;
  target_hours: number;
}

interface AuthContextType {
  user: User | null;
  settings: UserSettings | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  settings: null,
  loading: true,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: () => {},
  updateSettings: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ojt_token');
    if (token) {
      api.verify().then((data) => {
        if (data?.user) {
          setUser(data.user);
          setSettings(data.settings || { excluded_days: ['Sun'], target_end_date: null, target_hours: 600 });
        } else {
          localStorage.removeItem('ojt_token');
        }
      }).catch(() => {
        localStorage.removeItem('ojt_token');
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const data = await api.login(email, password);
      if (data?.error) return { success: false, error: data.error };
      if (data?.token) {
        localStorage.setItem('ojt_token', data.token);
        setUser(data.user);
        setSettings(data.settings || { excluded_days: ['Sun'], target_end_date: null, target_hours: data.user.target_hours || 600 });
        return { success: true };
      }
      return { success: false, error: 'Login failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    try {
      const data = await api.register(email, password, name);
      if (data?.error) return { success: false, error: data.error };
      if (data?.token) {
        localStorage.setItem('ojt_token', data.token);
        setUser(data.user);
        setSettings({ excluded_days: ['Sun'], target_end_date: null, target_hours: 600 });
        return { success: true };
      }
      return { success: false, error: 'Registration failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ojt_token');
    setUser(null);
    setSettings(null);
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
    const merged = { ...settings, ...newSettings } as UserSettings;
    try {
      const data = await api.saveSettings(merged);
      if (data?.settings) {
        setSettings(data.settings);
      } else {
        setSettings(merged);
      }
      if (merged.target_hours && user) {
        setUser({ ...user, target_hours: merged.target_hours });
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  }, [settings, user]);

  return (
    <AuthContext.Provider value={{ user, settings, loading, login, register, logout, updateSettings }}>
      {children}
    </AuthContext.Provider>
  );
};
