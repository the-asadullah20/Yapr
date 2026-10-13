import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { api } from '../api/apiClient';
import { syncPushIfGranted, unsubscribeFromPush } from '../utils/pushNotifications';
import { SelectUsernameModal } from '../components/auth/SelectUsernameModal';
import { DEFAULT_AVATAR } from '../utils/avatar';

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
  const [needsUsernameModal, setNeedsUsernameModal] = useState(false);
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
            syncPushIfGranted().catch(() => {});
            const isOnboarded = !!res.user.onboarding_completed || !!localStorage.getItem(`yapr_onboarded_${res.user.id}`);
            if (!isOnboarded || res.user.is_new_user || !res.user.username || res.user.username.startsWith('user_')) {
              setNeedsUsernameModal(true);
            }
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
              const isOnboarded = !!syncRes.user.onboarding_completed || !!localStorage.getItem(`yapr_onboarded_${syncRes.user.id}`);
              if (!isOnboarded || syncRes.user.is_new_user || !syncRes.user.username || syncRes.user.username.startsWith('user_')) {
                setNeedsUsernameModal(true);
              }
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
              DEFAULT_AVATAR,
            country_code: 'PK',
            follower_count: 0,
            following_count: 0,
            onboarding_completed: false,
            is_new_user: true,
          };

          setUser(fallbackProfile);
          const isFallbackOnboarded = !!localStorage.getItem(`yapr_onboarded_${fallbackProfile.id}`);
          if (!isFallbackOnboarded || fallbackProfile.username.startsWith('user_')) {
            setNeedsUsernameModal(true);
          }
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
    const isOnboarded = !!res.user.onboarding_completed || !!localStorage.getItem(`yapr_onboarded_${res.user.id}`);
    const isNew = !!res.isNewUser || !isOnboarded || !res.user.username || res.user.username.startsWith('user_');
    if (isNew) {
      setNeedsUsernameModal(true);
    }
    return { isNewUser: isNew };
  };

  const loginWithPassword = async (email: string, password: string) => {
    const res = await api.loginWithPassword(email, password);
    setToken(res.token);
    setUser(res.user);
    const isOnboarded = !!res.user.onboarding_completed || !!localStorage.getItem(`yapr_onboarded_${res.user.id}`);
    if (!isOnboarded || res.user.is_new_user || !res.user.username || res.user.username.startsWith('user_')) {
      setNeedsUsernameModal(true);
    }
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
    setNeedsUsernameModal(true);
  };

  const logout = () => {
    unsubscribeFromPush().catch(() => {});
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
      {user && (
        <SelectUsernameModal
          isOpen={needsUsernameModal}
          initialUsername={user.username}
          initialDisplayName={user.display_name}
          initialIsPrivate={!!user.is_private}
          initialAvatarUrl={user.avatar_url}
          onComplete={(chosen, chosenDisplayName, isPrivate, bannerUrl, avatarUrl) => {
            setUser((prev) =>
              prev
                ? {
                    ...prev,
                    username: chosen,
                    display_name: chosenDisplayName || prev.display_name,
                    is_private: isPrivate,
                    onboarding_completed: true,
                    ...(bannerUrl ? { banner_url: bannerUrl } : {}),
                    ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
                  }
                : null
            );
            if (user?.id) {
              localStorage.setItem(`yapr_onboarded_${user.id}`, 'true');
            }
            setNeedsUsernameModal(false);
          }}
        />
      )}
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
