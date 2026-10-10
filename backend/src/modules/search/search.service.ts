import { supabaseAdmin, isSupabaseConfigured } from '../../config/supabase.js';
import { expandSearchTermsWithRomanUrdu, normalizeRomanUrduWord } from '../../utils/romanUrdu.js';
import { mockYaps } from '../yaps/yaps.service.js';

export interface SearchResultItem {
  type: 'yap' | 'user' | 'hashtag';
  id?: string;
  username?: string;
  title: string;
  subtitle: string;
  avatar_url?: string;
  country_code?: string;
}

export class SearchService {
  async search(query: string, type: 'all' | 'yaps' | 'users' | 'hashtags' = 'all', limit = 20): Promise<{
    results: SearchResultItem[];
    expandedTerms: string[];
  }> {
    const cleanQuery = query.trim();
    if (!cleanQuery) return { results: [], expandedTerms: [] };

    const expandedTerms = expandSearchTermsWithRomanUrdu(cleanQuery);

    if (isSupabaseConfigured) {
      const dbResults: SearchResultItem[] = [];

      // 1. Search Users (by username or display_name)
      if (type === 'all' || type === 'users') {
        const { data: users } = await supabaseAdmin
          .from('profiles')
          .select('id, username, display_name, avatar_url, country_code')
          .or(`username.ilike.%${cleanQuery.replace(/^@/, '')}%,display_name.ilike.%${cleanQuery}%`)
          .limit(limit);

        if (users) {
          users.forEach((u: any) => {
            dbResults.push({
              type: 'user',
              id: u.id,
              username: u.username,
              title: u.display_name || u.username,
              subtitle: `@${u.username}`,
              avatar_url: u.avatar_url,
              country_code: u.country_code,
            });
          });
        }
      }

      // 2. Search Yaps (by post content / keywords)
      if (type === 'all' || type === 'yaps') {
        const { data: yaps } = await supabaseAdmin
          .from('yaps')
          .select('id, body, created_at, author:profiles!author_id(id, username, display_name, avatar_url, country_code)')
          .ilike('body', `%${cleanQuery}%`)
          .is('deleted_at', null)
          .limit(limit);

        if (yaps) {
          yaps.forEach((y: any) => {
            dbResults.push({
              type: 'yap',
              id: y.id,
              title: y.author?.display_name || `@${y.author?.username}` || 'Yap',
              subtitle: y.body,
              avatar_url: y.author?.avatar_url,
              country_code: y.author?.country_code,
            });
          });
        }
      }

      // 3. Search Hashtags
      if (type === 'all' || type === 'hashtags') {
        const cleanTag = cleanQuery.replace(/^#/, '');
        const { data: tags } = await supabaseAdmin
          .from('hashtags')
          .select('tag, total_count')
          .ilike('tag', `%${cleanTag}%`)
          .limit(5);

        if (tags) {
          tags.forEach((t: any) => {
            dbResults.push({
              type: 'hashtag',
              title: `#${t.tag}`,
              subtitle: `${t.total_count || 1} yaps`,
            });
          });
        }
      }

      if (dbResults.length > 0) {
        return { results: dbResults.slice(0, limit), expandedTerms };
      }
    }

    // In-Memory Search Fallback with Roman Urdu Expansion
    const results: SearchResultItem[] = [];

    // Search Hashtags
    if (type === 'all' || type === 'hashtags') {
      ['Tech', 'Karachi', 'PulseAi', 'Cricket', 'Design', 'Yapr'].forEach((tag) => {
        if (tag.toLowerCase().includes(cleanQuery.toLowerCase().replace(/^#/, ''))) {
          results.push({
            type: 'hashtag',
            title: `#${tag}`,
            subtitle: 'Trending topic on Yapr',
            country_code: 'PK',
          });
        }
      });
    }

    // Search Users
    if (type === 'all' || type === 'users') {
      [
        { name: 'Asad Ahmad', handle: 'asadahmad', pic: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', country: 'PK' },
        { name: 'Pan Feng Shui', handle: 'panfengshui', pic: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', country: 'SG' },
        { name: 'Clara Kim', handle: 'clarakim', pic: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', country: 'US' },
      ].forEach((u) => {
        if (u.name.toLowerCase().includes(cleanQuery.toLowerCase()) || u.handle.toLowerCase().includes(cleanQuery.toLowerCase())) {
          results.push({
            type: 'user',
            username: u.handle,
            title: u.name,
            subtitle: `@${u.handle}`,
            avatar_url: u.pic,
            country_code: u.country,
          });
        }
      });
    }

    // Search Yaps (testing with expanded Roman Urdu terms)
    if (type === 'all' || type === 'yaps') {
      mockYaps.forEach((yap) => {
        const lowerBody = yap.body.toLowerCase();
        const matches = expandedTerms.some((term) => lowerBody.includes(term.toLowerCase()));
        if (matches) {
          results.push({
            type: 'yap',
            id: yap.id,
            title: yap.author?.display_name || 'Yap',
            subtitle: yap.body,
            avatar_url: yap.author?.avatar_url,
            country_code: yap.author?.country_code,
          });
        }
      });
    }

    return { results: results.slice(0, limit), expandedTerms };
  }
}

export const searchService = new SearchService();
