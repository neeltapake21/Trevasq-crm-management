import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  switchDemoRole: (role: 'admin' | 'marketing_manager' | 'analyst') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('trevasq_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUser = async () => {
      const savedToken = localStorage.getItem('trevasq_token');
      if (savedToken) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data);
        } catch (err) {
          localStorage.removeItem('trevasq_token');
          localStorage.removeItem('trevasq_user');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const login = async (email: string, password = 'TrevasQ@2026') => {
    const res = await api.post('/auth/login', { email, password });
    const { access_token, user: loggedUser } = res.data;
    localStorage.setItem('trevasq_token', access_token);
    localStorage.setItem('trevasq_user', JSON.stringify(loggedUser));
    setToken(access_token);
    setUser(loggedUser);
  };

  const logout = () => {
    localStorage.removeItem('trevasq_token');
    localStorage.removeItem('trevasq_user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  const switchDemoRole = async (role: 'admin' | 'marketing_manager' | 'analyst') => {
    const emails: Record<string, string> = {
      admin: 'admin@trevasq.com',
      marketing_manager: 'marketing@trevasq.com',
      analyst: 'analyst@trevasq.com',
    };
    await login(emails[role]);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, switchDemoRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
