import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { api } from '../api/apiClient';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  loginWithOtp: (email: string, code: string) => Promise<{ isNewUser: boolean }>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  registerWithPassword: (params: {
    email: string;
    password: string;
    username: string;
    displayName?: string;
    countryCode?: string;
  }) => Promise<void>;
  logout: () => void;
  updateUser: (profile: Partial<UserProfile>) => void;
  setSession: (token: string, user: UserProfile) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('yapr_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('yapr_token') || null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('yapr_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('yapr_user');
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('yapr_token', token);
    } else {
      localStorage.removeItem('yapr_token');
    }
  }, [token]);

  const setSession = (newToken: string, newUser: UserProfile) => {
    setToken(newToken);
    setUser(newUser);
  };

  const loginWithOtp = async (email: string, code: string): Promise<{ isNewUser: boolean }> => {
    const res = await api.verifyOtp(email, code);
    setToken(res.token);
    setUser(res.user);
    return { isNewUser: !!res.isNewUser };
  };

  const loginWithPassword = async (email: string, password: string) => {
    const res = await api.loginWithPassword(email, password);
    setToken(res.token);
    setUser(res.user);
  };

  const registerWithPassword = async (params: {
    email: string;
    password: string;
    username: string;
    displayName?: string;
    countryCode?: string;
  }) => {
    const res = await api.registerWithPassword(params);
    setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
  };

  const updateUser = (updates: Partial<UserProfile>) => {
    if (user) {
      const next = { ...user, ...updates };
      setUser(next);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loginWithOtp,
        loginWithPassword,
        registerWithPassword,
        logout,
        updateUser,
        setSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
