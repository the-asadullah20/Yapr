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
        yaps: [
          {
            id: 'f1111111-1111-1111-1111-111111111111',
            author_id: 'b2222222-2222-2222-2222-222222222222',
            author: {
              id: 'b2222222-2222-2222-2222-222222222222',
              username: 'panfengshui',
              display_name: 'Pan Feng Shui',
              avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
              country_code: 'SG',
              follower_count: 12400,
              following_count: 450,
              is_verified: true,
            },
            body: 'One of the perks of working in an international company is sharing knowledge with your colleagues across continents! Great brainstorm session today on next-gen distributed systems. #Tech #Design',
            media: [
              'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
              'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800',
              'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
            ],
            like_count: 120000,
            reply_count: 25,
            reyap_count: 231,
            summary: 'Pan highlights cross-continental knowledge sharing and brainstorming next-gen distributed systems with colleagues.',
            created_at: new Date(Date.now() - 3600000).toISOString(),
            is_liked: false,
            is_reyapped: false,
            is_bookmarked: false,
            why_label: 'Trending on Yapr',
          },
          {
            id: 'f2222222-2222-2222-2222-222222222222',
            author_id: 'c3333333-3333-3333-3333-333333333333',
            author: {
              id: 'c3333333-3333-3333-3333-333333333333',
              username: 'clarakim',
              display_name: 'Clara Kim',
              avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
              country_code: 'US',
              follower_count: 8920,
              following_count: 210,
              is_verified: false,
            },
            body: 'A Great Way To Generate All The Motivation You Need To Get Fit: Start small, track consistency over intensity, and let dopamine reward your habit loops! 💪🏃‍♀️ #Fitness #Mindset',
            media: [
              'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800',
            ],
            like_count: 840,
            reply_count: 14,
            reyap_count: 9,
            summary: 'Clara emphasizes building sustainable fitness through small daily consistency rather than sporadic intense workouts.',
            created_at: new Date(Date.now() - 7200000).toISOString(),
            is_liked: false,
            is_reyapped: false,
            is_bookmarked: false,
            why_label: 'From people you follow',
          },
          {
            id: 'f3333333-3333-3333-3333-333333333333',
            author_id: 'a1111111-1111-1111-1111-111111111111',
            author: {
              id: 'a1111111-1111-1111-1111-111111111111',
              username: 'asadahmad',
              display_name: 'Asad Ahmad',
              avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
              country_code: 'PK',
              follower_count: 1420,
              following_count: 310,
              is_verified: true,
            },
            body: 'Welcome to Yapr! 🚀 Built with Express, React, Tailwind, Supabase Postgres, Redis Upstash, LavinMQ and dual AI models (Groq + Gemini). Check out the feed sliders to tune your algorithm! #Yapr #PulseAi #Tech #Karachi',
            media: [
              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
            ],
            like_count: 2450,
            reply_count: 68,
            reyap_count: 52,
            summary: 'Official launch: Yapr architecture overview, dual AI summarizers, and user-controlled feed ranking sliders.',
            created_at: new Date(Date.now() - 1800000).toISOString(),
            is_liked: true,
            is_reyapped: false,
            is_bookmarked: true,
            why_label: 'Recommended for you',
          },
        ],
        algorithmMetadata: {
          stage: 'Stage 1 Rule-Based',
          formula: 'score = (likes*1 + replies*3 + reyaps*2) * recency_decay + author_affinity',
        },
      };
    }
  },

  // Create Yap
  async createYap(body: string, media: string[] = [], taggedLabel?: string, countryCode?: string): Promise<Yap> {
    const res = await fetch(`${API_BASE}/yaps`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ body, media, taggedLabel, countryCode }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create Yap');
    }
    const data = await res.json();
    return data.yap;
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

  // Auth
  async requestOtp(email: string): Promise<{ success: boolean; previewCode?: string }> {
    const res = await fetch(`${API_BASE}/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return await res.json();
  },

  async verifyOtp(email: string, code: string): Promise<{ token: string; user: any }> {
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
};
