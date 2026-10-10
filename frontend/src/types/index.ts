export interface UserProfile {
  id: string;
  email?: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  country_code: string;
  follower_count: number;
  following_count: number;
  is_verified?: boolean;
  is_private?: boolean;
  is_following?: boolean;
  is_requested?: boolean;
}

export interface Yap {
  id: string;
  author_id: string;
  parent_id?: string | null;
  body: string;
  media: string[];
  like_count: number;
  reply_count: number;
  reyap_count: number;
  summary?: string | null;
  tagged_label?: string | null;
  created_at: string;
  author?: UserProfile;
  is_liked?: boolean;
  is_reyapped?: boolean;
  is_bookmarked?: boolean;
  is_following?: boolean;
  is_reyap?: boolean;
  reyapped_by?: {
    id: string;
    username: string;
    display_name?: string;
  };
  final_score?: number;
  why_label?: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  type: string;
  actor_ids: string[];
  yap_id?: string;
  read_at?: string | null;
  created_at: string;
  formatted_text?: string;
  actors?: Array<{
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
  }>;
}

export interface TrendingTopic {
  tag: string;
  count: number;
  countryCode: string;
}

export interface SearchResult {
  type: 'yap' | 'user' | 'hashtag';
  id?: string;
  username?: string;
  title: string;
  subtitle: string;
  avatar_url?: string;
  country_code?: string;
}

export interface FeedSliderSettings {
  followingWeight: number;
  viralWeight: number;
  recencyHours: number;
}
