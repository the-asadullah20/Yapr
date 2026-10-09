import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { api } from '../api/apiClient';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  loginWithOtp: (email: string, code: string) => Promise<void>;
  logout: () => void;
  updateUser: (profile: Partial<UserProfile>) => void;
  switchDemoUser: (username: string) => void;
}

const DEFAULT_USER: UserProfile = {
  id: 'a1111111-1111-1111-1111-111111111111',
  username: 'asadahmad',
  display_name: 'Asad Ahmad',
  bio: 'Building Yapr 🚀 | Full Stack Engineer & System Designer',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  country_code: 'PK',
  follower_count: 1420,
  following_count: 310,
  is_verified: true,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('yapr_user');
    return saved ? JSON.parse(saved) : DEFAULT_USER;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('yapr_token') || 'demo_token_yapr';
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

  const loginWithOtp = async (email: string, code: string) => {
    const res = await api.verifyOtp(email, code);
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

  const switchDemoUser = (username: string) => {
    if (username === 'panfengshui') {
      setUser({
        id: 'b2222222-2222-2222-2222-222222222222',
        username: 'panfengshui',
        display_name: 'Pan Feng Shui',
        bio: 'Work hard, travel harder. Sharing knowledge with colleagues worldwide 🌏',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        country_code: 'SG',
        follower_count: 12400,
        following_count: 450,
        is_verified: true,
      });
    } else if (username === 'clarakim') {
      setUser({
        id: 'c3333333-3333-3333-3333-333333333333',
        username: 'clarakim',
        display_name: 'Clara Kim',
        bio: 'Fitness enthusiast, UX designer & AI researcher 💡',
        avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        country_code: 'US',
        follower_count: 8920,
        following_count: 210,
        is_verified: false,
      });
    } else {
      setUser(DEFAULT_USER);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loginWithOtp,
        logout,
        updateUser,
        switchDemoUser,
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
