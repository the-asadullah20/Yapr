import { supabaseAdmin, isSupabaseConfigured } from '../../config/supabase.js';
import { expandSearchTermsWithRomanUrdu, normalizeRomanUrduWord } from '../../utils/romanUrdu.js';
import { mockYaps } from '../yaps/yaps.service.js';

export interface SearchResultItem {
  type: 'yap' | 'user' | 'hashtag';
  id?: string;
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
      const { data, error } = await supabaseAdmin.rpc('search_yapr', {
        p_query: cleanQuery,
        p_type: type,
        p_limit: limit,
      });

      if (!error && data) {
        const formatted: SearchResultItem[] = data.map((item: any) => ({
          type: item.result_type,
          id: item.id,
          title: item.title,
          subtitle: item.subtitle,
          avatar_url: item.avatar_url,
          country_code: item.country_code,
        }));
        return { results: formatted, expandedTerms };
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
