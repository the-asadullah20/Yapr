import { Yap, UserProfile, NotificationItem, TrendingTopic, SearchResult, FeedSliderSettings } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('yapr_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const api = {
  // Feed
  async getFeed(mode: 'ranked' | 'chronological' = 'ranked', sliders?: FeedSliderSettings, country?: string): Promise<{ yaps: Yap[]; algorithmMetadata?: any }> {
    try {
      const params = new URLSearchParams();
      params.append('mode', mode);
      if (country) params.append('country', country);
      if (sliders) {
        params.append('followingWeight', sliders.followingWeight.toString());
        params.append('viralWeight', sliders.viralWeight.toString());
        params.append('recencyHours', sliders.recencyHours.toString());
      }
      const res = await fetch(`${API_BASE}/feed?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch feed');
      return await res.json();
    } catch (err) {
      console.warn('API getFeed fallback to default:', err);
      return {
        yaps: [],
        algorithmMetadata: {
          stage: 'Stage 1 Rule-Based',
          formula: 'score = (likes*1 + replies*3 + reyaps*2) * recency_decay + author_affinity',
        },
      };
    }

  },

  // Create Yap
  async createYap(
    body: string,
    media: string[] = [],
    taggedLabel?: string,
    countryCode?: string,
    parentId?: string
  ): Promise<Yap> {
    const res = await fetch(`${API_BASE}/yaps`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ body, media, taggedLabel, countryCode, parentId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create Yap');
    }
    const data = await res.json();
    return data.yap;
  },

  async deleteYap(yapId: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/yaps/${yapId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete Yap');
    }
    return true;
  },

  async getYapById(yapId: string): Promise<Yap> {
    const res = await fetch(`${API_BASE}/yaps/${yapId}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Yap not found');
    const data = await res.json();
    return data.yap || data;
  },

  // Thread Replies
  async getReplies(yapId: string): Promise<Yap[]> {
    const res = await fetch(`${API_BASE}/yaps/${yapId}/replies`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.replies || [];
  },

  // Social actions
  async toggleLike(yapId: string): Promise<{ liked: boolean; likeCount: number }> {
    const res = await fetch(`${API_BASE}/social/like/${yapId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return await res.json();
  },

  async getYapLikers(yapId: string): Promise<UserProfile[]> {
    try {
      const res = await fetch(`${API_BASE}/social/likes/${yapId}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.likers || [];
    } catch {
      return [];
    }
  },

  async toggleReyap(yapId: string, quoteBody?: string): Promise<{ reyapped: boolean; reyapCount: number }> {
    const res = await fetch(`${API_BASE}/social/reyap/${yapId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ quoteBody }),
    });
    return await res.json();
  },

  async toggleFollow(userId: string): Promise<{ following: boolean }> {
    const res = await fetch(`${API_BASE}/social/follow/${userId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return await res.json();
  },

  async toggleBookmark(yapId: string): Promise<{ bookmarked: boolean }> {
    const res = await fetch(`${API_BASE}/social/bookmark/${yapId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return await res.json();
  },

  async getBookmarks(): Promise<{ yaps: Yap[] }> {
    const res = await fetch(`${API_BASE}/social/bookmarks`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch bookmarks');
    return await res.json();
  },

  async blockUser(userId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/social/block/${userId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return await res.json();
  },

  async reportContent(payload: { yapId?: string; reportedUserId?: string; reason: string }): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/social/report`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  async unblockUser(userId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/social/unblock/${userId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return await res.json();
  },

  async getBlockedUsers(): Promise<UserProfile[]> {
    try {
      const res = await fetch(`${API_BASE}/social/blocks`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.blocks || [];
    } catch {
      return [];
    }
  },

  async isUserBlocked(userId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/social/is-blocked/${userId}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return false;
      const data = await res.json();
      return !!data.isBlocked;
    } catch {
      return false;
    }
  },

  async getUserReports(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/social/reports`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.reports || [];
    } catch {
      return [];
    }
  },

  // Trending
  async getTrending(country = 'PK', timeframe: '1h' | '24h' = '24h'): Promise<TrendingTopic[]> {
    try {
      const res = await fetch(`${API_BASE}/trending?country=${country}&timeframe=${timeframe}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      return data.topics || [];
    } catch {
      return [
        { tag: 'Karachi', count: 1840, countryCode: 'PK' },
        { tag: 'Tech', count: 1420, countryCode: 'PK' },
        { tag: 'Cricket', count: 980, countryCode: 'PK' },
        { tag: 'Yapr', count: 850, countryCode: 'PK' },
        { tag: 'PulseAi', count: 620, countryCode: 'PK' },
      ];
    }
  },

  // Search
  async search(q: string, type: string = 'all'): Promise<{ results: SearchResult[]; expandedTerms: string[] }> {
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}&type=${type}`);
    if (!res.ok) return { results: [], expandedTerms: [] };
    return await res.json();
  },

  // Notifications
  async getNotifications(): Promise<{ notifications: NotificationItem[]; unreadCount: number }> {
    try {
      const res = await fetch(`${API_BASE}/notifications`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return {
        unreadCount: 1,
        notifications: [
          {
            id: 'n1',
            user_id: 'me',
            type: 'like',
            actor_ids: ['b2'],
            created_at: new Date(Date.now() - 900000).toISOString(),
            formatted_text: 'Pan Feng Shui liked your Yap',
            actors: [{
              id: 'b2',
              username: 'panfengshui',
              display_name: 'Pan Feng Shui',
              avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
            }],
          },
        ],
      };
    }
  },

  async markNotificationsRead(): Promise<void> {
    await fetch(`${API_BASE}/notifications/mark-read`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  // AI
  async summarizeYap(yapId: string, text: string, threadText?: string): Promise<{ summary: string; provider: string }> {
    const res = await fetch(`${API_BASE}/ai/summarize`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ yapId, text, threadText }),
    });
    if (!res.ok) throw new Error('AI summary generation failed');
    return await res.json();
  },

  async translateYap(text: string, targetLanguage: string): Promise<{ translation: string; targetLanguage: string; provider: string }> {
    const res = await fetch(`${API_BASE}/ai/translate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ text, targetLanguage }),
    });
    if (!res.ok) throw new Error('AI translation failed');
    return await res.json();
  },

  async polishYap(text: string): Promise<{ polished: string; hashtags: string[]; provider: string }> {
    const res = await fetch(`${API_BASE}/ai/polish`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error('AI polishing failed');
    return await res.json();
  },

  // Bloom Filter Username Check
  async checkUsername(username: string): Promise<{ available: boolean; method: string }> {
    const res = await fetch(`${API_BASE}/profiles/check-username?username=${encodeURIComponent(username)}`);
    return await res.json();
  },

  async requestOtp(email: string): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`${API_BASE}/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return await res.json();
  },

  async verifyOtp(email: string, code: string): Promise<{ token: string; user: any; isNewUser?: boolean }> {
    const res = await fetch(`${API_BASE}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Verification failed');
    }
    return await res.json();
  },

  async loginWithPassword(email: string, password: string): Promise<{ token: string; user: any }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Login failed');
    }
    return await res.json();
  },

  async registerWithPassword(params: {
    email: string;
    password: string;
    username: string;
    displayName?: string;
    countryCode?: string;
  }): Promise<{ token: string; user: any }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Registration failed');
    }
    return await res.json();
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to send reset code');
    }
    return await res.json();
  },

  async resetPassword(params: { email: string; code: string; newPassword: string }): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to reset password');
    }
    return await res.json();
  },

  async changePassword(params: { currentPassword: string; newPassword: string }): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to change password');
    }
    return await res.json();
  },

  async getMe(): Promise<{ user: UserProfile }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error('Failed to fetch user session');
    }
    return await res.json();
  },

  async syncOAuthUser(token: string, metadata?: any): Promise<{ user: UserProfile }> {
    const res = await fetch(`${API_BASE}/auth/oauth-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ metadata }),
    });
    if (!res.ok) {
      throw new Error('Failed to sync OAuth user');
    }
    return await res.json();
  },


  // Profile
  async getProfile(identifier: string): Promise<UserProfile> {
    const res = await fetch(`${API_BASE}/profiles/${identifier}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    return data.profile;
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const res = await fetch(`${API_BASE}/profiles/me`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    return data.profile;
  },

  async getUserYaps(identifier: string): Promise<{ is_private: boolean; yaps: Yap[] }> {
    try {
      const res = await fetch(`${API_BASE}/profiles/${identifier}/yaps`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return { is_private: false, yaps: [] };
      return await res.json();
    } catch {
      return { is_private: false, yaps: [] };
    }
  },

  async getFollowers(identifier: string): Promise<UserProfile[]> {
    try {
      const res = await fetch(`${API_BASE}/profiles/${identifier}/followers`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.followers || [];
    } catch {
      return [];
    }
  },

  async getFollowing(identifier: string): Promise<UserProfile[]> {
    try {
      const res = await fetch(`${API_BASE}/profiles/${identifier}/following`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.following || [];
    } catch {
      return [];
    }
  },

  // Storage / Uploads
  async uploadAvatar(file: File): Promise<{ url: string }> {
    const token = localStorage.getItem('yapr_token');
    const formData = new FormData();
    formData.append('avatar', file);

    const res = await fetch(`${API_BASE}/media/avatar`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload profile picture');
    }
    return await res.json();
  },

  async uploadMedia(file: File): Promise<{ url: string }> {
    const token = localStorage.getItem('yapr_token');
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/media/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload media');
    }
    return await res.json();
  },
};
