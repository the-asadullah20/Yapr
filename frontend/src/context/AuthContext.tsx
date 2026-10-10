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
    let u: UserProfile | null = saved ? JSON.parse(saved) : null;
    const t = localStorage.getItem('yapr_token');
    if (u && !u.email && t) {
      try {
        const payload = JSON.parse(atob(t.split('.')[1]));
        if (payload?.email) {
          u = { ...u, email: payload.email };
        }
      } catch {
        // ignore
      }
    }
    return u;
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

  // Sync profile on mount if token exists
  useEffect(() => {
    const fetchLatestProfile = async () => {
      const storedToken = localStorage.getItem('yapr_token');
      if (storedToken) {
        try {
          const res = await api.getMe();
          if (res?.user) {
            setUser((prev) => ({ ...(prev || {}), ...res.user }));
          }
        } catch {
          // ignore error if token expired or offline
        }
      }
    };
    fetchLatestProfile();
  }, []);

  // Handle OAuth callback (Google & Facebook redirect return)
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const hash = window.location.hash;
      if (!hash || !hash.includes('access_token')) return;

      const params = new URLSearchParams(hash.replace(/^#/, ''));
      const accessToken = params.get('access_token');
      if (accessToken) {
        try {
          const base64Url = accessToken.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const payload = JSON.parse(jsonPayload);
          const email = payload.email || '';

          // Clean URL immediately
          window.history.replaceState(null, '', window.location.pathname);

          // Save token
          setToken(accessToken);
          localStorage.setItem('yapr_token', accessToken);

          // Sync with backend to preserve user's REAL existing profile (PFP, username, display_name)
          try {
            const syncRes = await api.syncOAuthUser(accessToken, payload.user_metadata);
            if (syncRes?.user) {
              setUser(syncRes.user);
              return;
            }
          } catch (syncErr) {
            console.warn('OAuth backend sync failed, using fallback:', syncErr);
          }

          // Fallback only if backend is unreachable
          const rawName =
            payload.user_metadata?.full_name ||
            payload.user_metadata?.name ||
            email.split('@')[0] ||
            'Yapr User';
          const username =
            payload.user_metadata?.user_name ||
            email.split('@')[0]?.replace(/[^a-zA-Z0-9_]/g, '') ||
            `user_${payload.sub?.slice(0, 6)}`;

          const fallbackProfile: UserProfile = {
            id: payload.sub,
            email,
            username,
            display_name: rawName,
            avatar_url:
              payload.user_metadata?.avatar_url ||
              payload.user_metadata?.picture ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
            country_code: 'PK',
            follower_count: 0,
            following_count: 0,
          };

          setUser(fallbackProfile);
        } catch (e) {
          console.error('Failed to parse OAuth session:', e);
        }
      }
    };

    handleOAuthCallback();
  }, []);

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
