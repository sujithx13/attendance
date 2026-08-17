import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';
import type { User } from '../types/index.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('kahe_admin_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('kahe_admin_token');
      if (!savedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.getMe();
        if (res.user.role !== 'ADMIN') {
          throw new Error('Access denied. Administrator privileges required.');
        }
        setUser(res.user);
        setToken(savedToken);
      } catch {
        api.logout();
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.login(email, pass);
    if (res.user.role !== 'ADMIN') {
      api.logout();
      throw new Error('Access denied. This dashboard is strictly reserved for Administrators.');
    }
    setUser(res.user);
    setToken(res.token);
  };

  const logout = () => {
    api.logout();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
