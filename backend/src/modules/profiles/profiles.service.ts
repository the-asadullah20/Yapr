import { supabaseAdmin, isSupabaseConfigured } from '../../config/supabase.js';
import { usernameBloomFilter } from '../../utils/bloomFilter.js';
import { COUNTRIES, getCountryByCode } from '../../utils/countries.js';
import { mockYaps } from '../yaps/yaps.service.js';
import { mockUserReyaps } from '../social/social.service.js';

// In-memory mock profiles for dev/fallback
const mockProfiles = new Map<string, any>([
  [
    'a1111111-1111-1111-1111-111111111111',
    {
      id: 'a1111111-1111-1111-1111-111111111111',
      username: 'asadahmad',
      display_name: 'Asad Ahmad',
      bio: 'Building Yapr 🚀 | Full Stack Engineer & System Designer',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      banner_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200',
      country_code: 'PK',
      follower_count: 1420,
      following_count: 310,
      is_verified: true,
    },
  ],
  [
    'b2222222-2222-2222-2222-222222222222',
    {
      id: 'b2222222-2222-2222-2222-222222222222',
      username: 'panfengshui',
      display_name: 'Pan Feng Shui',
      bio: 'Work hard, travel harder. Sharing knowledge with colleagues worldwide 🌏',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      banner_url: '',
      country_code: 'SG',
      follower_count: 12400,
      following_count: 450,
      is_verified: true,
    },
  ],
  [
    'c3333333-3333-3333-3333-333333333333',
    {
      id: 'c3333333-3333-3333-3333-333333333333',
      username: 'clarakim',
      display_name: 'Clara Kim',
      bio: 'Fitness enthusiast, UX designer & AI researcher 💡',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      banner_url: '',
      country_code: 'US',
      follower_count: 8920,
      following_count: 210,
      is_verified: false,
    },
  ],
]);

// Initialize bloom filter with existing usernames
['asadahmad', 'panfengshui', 'clarakim', 'hamza_tech', 'zainab_writes', 'ali', 'admin', 'yapr'].forEach((u) => {
  usernameBloomFilter.add(u).catch(() => {});
});


export class ProfilesService {
  /**
   * Fast username availability check using Bloom Filter + Postgres source of truth
   */
  async checkUsernameAvailability(username: string): Promise<{ available: boolean; method: string }> {
    const clean = username.toLowerCase().trim();
    if (!clean || clean.length < 3 || clean.length > 30) {
      return { available: false, method: 'validation' };
    }

    // Step 1: Bloom filter pre-check
    const mightExist = await usernameBloomFilter.mightExist(clean);
    if (!mightExist) {
      // 100% definitely free!
      return { available: true, method: 'bloom-filter-guaranteed' };
    }

    // Step 2: Bloom filter indicated potential collision -> check Postgres unique index
    if (isSupabaseConfigured) {
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .ilike('username', clean)
        .maybeSingle();

      const available = !data;
      return { available, method: 'postgres-unique-check' };
    }

    // Fallback to in-memory store
    const reserved = ['asadahmad', 'panfengshui', 'clarakim', 'hamza_tech', 'zainab_writes', 'ali', 'admin', 'yapr'];
    if (reserved.includes(clean)) {
      return { available: false, method: 'reserved-check' };
    }

    for (const p of mockProfiles.values()) {
      if (p.username.toLowerCase() === clean) {
        return { available: false, method: 'mock-check' };
      }
    }
    return { available: true, method: 'mock-check' };

  }

  async getProfile(identifier: string, viewerId?: string): Promise<any> {
    if (isSupabaseConfigured) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
      const query = supabaseAdmin.from('profiles').select('*');
      const { data, error } = isUuid
        ? await query.eq('id', identifier).maybeSingle()
        : await query.ilike('username', identifier).maybeSingle();

      if (error) throw error;
      if (data) {
        let isFollowing = false;
        if (viewerId && viewerId !== data.id) {
          const { data: follow } = await supabaseAdmin
            .from('follows')
            .select('follower_id')
            .eq('follower_id', viewerId)
            .eq('followee_id', data.id)
            .maybeSingle();
          isFollowing = !!follow;
        }
        return {
          ...data,
          is_following: isFollowing,
          country: getCountryByCode(data.country_code || 'PK'),
        };
      }
    }

    // Fallback lookup
    for (const p of mockProfiles.values()) {
      if (p.id === identifier || p.username.toLowerCase() === identifier.toLowerCase()) {
        return {
          ...p,
          is_following: false,
          country: getCountryByCode(p.country_code || 'PK'),
        };
      }
    }

    // Return profile if not found in dev
    return {
      id: identifier,
      username: identifier,
      display_name: identifier,
      bio: 'Yapr Explorer',
      avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${identifier}`,
      country_code: 'PK',
      country: getCountryByCode('PK'),
      follower_count: 0,
      following_count: 0,
      is_following: false,
    };
  }

  async updateProfile(userId: string, updates: any): Promise<any> {
    const allowed = ['display_name', 'bio', 'avatar_url', 'banner_url', 'country_code', 'username', 'is_private'];
    const sanitized: any = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) sanitized[key] = updates[key];
    }

    if (sanitized.username) {
      sanitized.username = sanitized.username.toLowerCase().trim();
      if (sanitized.username.length < 3 || sanitized.username.length > 30) {
        throw new Error('Username must be between 3 and 30 characters');
      }
      if (isSupabaseConfigured) {
        const { data: existing } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .ilike('username', sanitized.username)
          .neq('id', userId)
          .maybeSingle();
        if (existing) {
          throw new Error(`Username @${sanitized.username} is already taken`);
        }
      }
      await usernameBloomFilter.add(sanitized.username);
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update({ ...sanitized, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    const existing = mockProfiles.get(userId) || { id: userId, follower_count: 0, following_count: 0 };
    const updated = { ...existing, ...sanitized };
    mockProfiles.set(userId, updated);
    return updated;
  }

  async getUserYaps(identifier: string, viewerId?: string): Promise<{ is_private: boolean; yaps: any[] }> {
    const profile = await this.getProfile(identifier, viewerId);
    if (!profile) return { is_private: false, yaps: [] };

    // Check if account is private
    const isOwner = viewerId === profile.id;
    const isFollowing = !!profile.is_following;
    if (profile.is_private && !isOwner && !isFollowing) {
      return { is_private: true, yaps: [] };
    }

    if (isSupabaseConfigured) {
      // 1. Fetch user's own authored yaps
      const { data: ownYaps, error: ownErr } = await supabaseAdmin
        .from('yaps')
        .select('*, author:profiles!author_id(*)')
        .eq('author_id', profile.id)
        .is('parent_id', null)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // 2. Fetch yaps reyapped by this user
      const { data: reyapRecords, error: reyapErr } = await supabaseAdmin
        .from('reyaps')
        .select(`
          created_at,
          yap:yaps!yap_id(
            *,
            author:profiles!author_id(*)
          )
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      const mappedReyaps: any[] = [];
        for (const item of (reyapRecords as any[])) {
          const yapData: any = Array.isArray(item.yap) ? item.yap[0] : item.yap;
          if (yapData && !yapData.deleted_at) {
            mappedReyaps.push({
              ...yapData,
              is_reyap: true,
              reyapped_by: {
                id: profile.id,
                username: profile.username,
                display_name: profile.display_name,
              },
              activity_at: item.created_at || yapData.created_at,
            });
          }
        }

      const mappedOwn = (ownYaps || []).map((y: any) => ({
        ...y,
        activity_at: y.created_at,
      }));

      // Combine both lists (avoiding duplicates if user reyapped their own yap)
      const combinedMap = new Map<string, any>();
      for (const y of mappedOwn) {
        combinedMap.set(y.id, y);
      }
      for (const ry of mappedReyaps) {
        if (!combinedMap.has(ry.id)) {
          combinedMap.set(ry.id, ry);
        } else {
          const existing = combinedMap.get(ry.id);
          combinedMap.set(ry.id, { ...existing, is_reyap: true, reyapped_by: ry.reyapped_by });
        }
      }

      let mergedYaps = Array.from(combinedMap.values()).sort(
        (a, b) => new Date(b.activity_at || b.created_at).getTime() - new Date(a.activity_at || a.created_at).getTime()
      );

      // Hydrate viewer like/reyap/bookmark status if viewerId is present
      if (viewerId && mergedYaps.length > 0) {
        const yapIds = mergedYaps.map((y) => y.id);
        const [{ data: userLikes }, { data: userReyaps }, { data: userBookmarks }] = await Promise.all([
          supabaseAdmin.from('likes').select('yap_id').eq('user_id', viewerId).in('yap_id', yapIds),
          supabaseAdmin.from('reyaps').select('yap_id').eq('user_id', viewerId).in('yap_id', yapIds),
          supabaseAdmin.from('bookmarks').select('yap_id').eq('user_id', viewerId).in('yap_id', yapIds),
        ]);

        const likedSet = new Set((userLikes || []).map((l: any) => l.yap_id));
        const reyappedSet = new Set((userReyaps || []).map((r: any) => r.yap_id));
        const bookmarkedSet = new Set((userBookmarks || []).map((b: any) => b.yap_id));

        mergedYaps = mergedYaps.map((y) => ({
          ...y,
          is_liked: likedSet.has(y.id),
          is_reyapped: reyappedSet.has(y.id),
          is_bookmarked: bookmarkedSet.has(y.id),
        }));
      }

      return { is_private: false, yaps: mergedYaps };
    }

    // Fallback in-memory mock mode
    const userSet = mockUserReyaps.get(profile.id) || new Set<string>();
    const ownYaps = mockYaps
      .filter((y) => (y.author_id === profile.id || y.author?.username?.toLowerCase() === profile.username?.toLowerCase()) && !y.parent_id)
      .map((y) => ({ ...y, activity_at: y.created_at }));

    const reyappedYaps = mockYaps
      .filter((y) => userSet.has(y.id))
      .map((y) => ({
        ...y,
        is_reyap: true,
        reyapped_by: {
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
        },
        activity_at: y.created_at,
      }));

    const combinedMap = new Map<string, any>();
    for (const y of ownYaps) combinedMap.set(y.id, y);
    for (const ry of reyappedYaps) {
      if (!combinedMap.has(ry.id)) combinedMap.set(ry.id, ry);
      else {
        const existing = combinedMap.get(ry.id);
        combinedMap.set(ry.id, { ...existing, is_reyap: true, reyapped_by: ry.reyapped_by });
      }
    }

    const yaps = Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.activity_at || b.created_at).getTime() - new Date(a.activity_at || a.created_at).getTime()
    );
    return { is_private: false, yaps };
  }

  async getFollowers(identifier: string): Promise<any[]> {
    const profile = await this.getProfile(identifier);
    if (!profile) return [];

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('follows')
        .select('created_at, follower:profiles!follower_id(id, username, display_name, avatar_url, is_verified, bio)')
        .eq('followee_id', profile.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map((d: any) => d.follower).filter(Boolean);
      }
    }

    return [];
  }

  async getFollowing(identifier: string): Promise<any[]> {
    const profile = await this.getProfile(identifier);
    if (!profile) return [];

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('follows')
        .select('created_at, followee:profiles!followee_id(id, username, display_name, avatar_url, is_verified, bio)')
        .eq('follower_id', profile.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map((d: any) => d.followee).filter(Boolean);
      }
    }

    return [];
  }

  getCountries() {
    return COUNTRIES;
  }
}

export const profilesService = new ProfilesService();
