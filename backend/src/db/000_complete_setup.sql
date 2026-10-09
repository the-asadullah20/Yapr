-- ==============================================================================
-- YAPR POSTGRES SCHEMA MIGRATION 001: INITIAL SCHEMA
-- Compliant with Supabase Postgres & Phase 1/2/3 Architecture
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector"; -- pgvector for v3 AI embeddings

-- 1. PROFILES TABLE (Mirrors and extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(30) NOT NULL,
    display_name VARCHAR(60) NOT NULL,
    bio VARCHAR(200) DEFAULT '',
    avatar_url TEXT DEFAULT '',
    banner_url TEXT DEFAULT '',
    country_code VARCHAR(2) NOT NULL DEFAULT 'PK', -- ISO 3166-1 alpha-2
    follower_count INTEGER NOT NULL DEFAULT 0,
    following_count INTEGER NOT NULL DEFAULT 0,
    is_private BOOLEAN NOT NULL DEFAULT false,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Unique index on case-insensitive username
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_lower_username ON public.profiles (lower(username));
CREATE INDEX IF NOT EXISTS idx_profiles_country_code ON public.profiles (country_code);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles (created_at DESC);

-- 2. YAPS TABLE (Posts and Threaded Replies)
CREATE TABLE IF NOT EXISTS public.yaps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.yaps(id) ON DELETE CASCADE, -- NULL for top-level, set for replies
    body TEXT NOT NULL CHECK (char_length(body) <= 500),
    media TEXT[] DEFAULT '{}', -- Array of Supabase Storage bucket URLs
    like_count INTEGER NOT NULL DEFAULT 0,
    reply_count INTEGER NOT NULL DEFAULT 0,
    reyap_count INTEGER NOT NULL DEFAULT 0,
    summary TEXT, -- AI-generated summary for long yaps / threads (v3)
    tagged_label VARCHAR(20), -- 'Agree', 'Disagree', 'Question', 'Source' for tagged replies
    embedding vector(1536), -- Vector embedding for recommendation & semantic search (v3)
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ, -- Soft delete support
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Indexes for fast feed queries and cursor-based pagination
CREATE INDEX IF NOT EXISTS idx_yaps_author_created ON public.yaps (author_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_yaps_created_at ON public.yaps (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_yaps_parent_id ON public.yaps (parent_id, created_at ASC) WHERE deleted_at IS NULL;

-- 3. FOLLOWS TABLE
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    followee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    PRIMARY KEY (follower_id, followee_id),
    CHECK (follower_id <> followee_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_followee ON public.follows (followee_id);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON public.follows (created_at DESC);

-- 4. LIKES TABLE
CREATE TABLE IF NOT EXISTS public.likes (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    yap_id UUID NOT NULL REFERENCES public.yaps(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    PRIMARY KEY (user_id, yap_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_yap_id ON public.likes (yap_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_created ON public.likes (user_id, created_at DESC);

-- 5. REYAPS (Retweets / Reposts & Quote Yaps)
CREATE TABLE IF NOT EXISTS public.reyaps (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    yap_id UUID NOT NULL REFERENCES public.yaps(id) ON DELETE CASCADE,
    quote_body TEXT CHECK (char_length(quote_body) <= 500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    PRIMARY KEY (user_id, yap_id)
);

CREATE INDEX IF NOT EXISTS idx_reyaps_yap_id ON public.reyaps (yap_id);
CREATE INDEX IF NOT EXISTS idx_reyaps_user_created ON public.reyaps (user_id, created_at DESC);

-- 6. HASHTAGS & YAP_HASHTAGS
CREATE TABLE IF NOT EXISTS public.hashtags (
    tag VARCHAR(100) PRIMARY KEY,
    total_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.yap_hashtags (
    tag VARCHAR(100) NOT NULL REFERENCES public.hashtags(tag) ON DELETE CASCADE,
    yap_id UUID NOT NULL REFERENCES public.yaps(id) ON DELETE CASCADE,
    country_code VARCHAR(2) NOT NULL DEFAULT 'PK',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    PRIMARY KEY (tag, yap_id)
);

CREATE INDEX IF NOT EXISTS idx_yap_hashtags_tag_created ON public.yap_hashtags (tag, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_yap_hashtags_country_created ON public.yap_hashtags (country_code, created_at DESC);

-- 7. NOTIFICATIONS (Stored for offline delivery + aggregation)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- Recipient
    type VARCHAR(30) NOT NULL, -- 'like', 'reply', 'reyap', 'follow', 'mention'
    actor_ids UUID[] NOT NULL DEFAULT '{}', -- Aggregated actors ("Ali and 3 others")
    yap_id UUID REFERENCES public.yaps(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications (user_id) WHERE read_at IS NULL;

-- 8. INTERACTIONS TABLE (Batch-logged for ML recommender)
CREATE TABLE IF NOT EXISTS public.interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    yap_id UUID NOT NULL REFERENCES public.yaps(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- 'view', 'like', 'reply', 'skip', 'dwell'
    dwell_ms INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_interactions_user_yap ON public.interactions (user_id, yap_id);
CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON public.interactions (created_at DESC);

-- 9. BOOKMARKS TABLE
CREATE TABLE IF NOT EXISTS public.bookmarks (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    yap_id UUID NOT NULL REFERENCES public.yaps(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    PRIMARY KEY (user_id, yap_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_created ON public.bookmarks (user_id, created_at DESC);

-- 10. BLOCKS AND REPORTS
CREATE TABLE IF NOT EXISTS public.blocks (
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    PRIMARY KEY (blocker_id, blocked_id),
    CHECK (blocker_id <> blocked_id)
);

CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    yap_id UUID REFERENCES public.yaps(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 11. YAP EDITS (Audit trail for transparency)
CREATE TABLE IF NOT EXISTS public.yap_edits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    yap_id UUID NOT NULL REFERENCES public.yaps(id) ON DELETE CASCADE,
    previous_body TEXT NOT NULL,
    edited_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
-- ==============================================================================
-- YAPR POSTGRES MIGRATION 002: ROW LEVEL SECURITY (RLS) POLICIES
-- Complete security policies guaranteeing zero data leaks
-- ==============================================================================

-- 1. ENABLE RLS ON ALL TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reyaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yap_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yap_edits ENABLE ROW LEVEL SECURITY;

-- 2. PROFILES POLICIES
CREATE POLICY "Profiles are visible to everyone"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 3. YAPS POLICIES
CREATE POLICY "Non-deleted yaps are visible to all users"
    ON public.yaps FOR SELECT
    USING (
        deleted_at IS NULL
        AND (
            auth.uid() IS NULL 
            OR NOT EXISTS (
                SELECT 1 FROM public.blocks 
                WHERE (blocker_id = author_id AND blocked_id = auth.uid())
                   OR (blocker_id = auth.uid() AND blocked_id = author_id)
            )
        )
    );

CREATE POLICY "Authenticated users can create yaps"
    ON public.yaps FOR INSERT
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their own yaps within 1 hour"
    ON public.yaps FOR UPDATE
    USING (auth.uid() = author_id AND created_at > (now() - interval '1 hour'))
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can soft delete their own yaps"
    ON public.yaps FOR UPDATE
    USING (auth.uid() = author_id);

-- 4. FOLLOWS POLICIES
CREATE POLICY "Follows are viewable by everyone"
    ON public.follows FOR SELECT
    USING (true);

CREATE POLICY "Users can follow others"
    ON public.follows FOR INSERT
    WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow others"
    ON public.follows FOR DELETE
    USING (auth.uid() = follower_id);

-- 5. LIKES POLICIES
CREATE POLICY "Likes are viewable by everyone"
    ON public.likes FOR SELECT
    USING (true);

CREATE POLICY "Users can like yaps"
    ON public.likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike yaps"
    ON public.likes FOR DELETE
    USING (auth.uid() = user_id);

-- 6. REYAPS POLICIES
CREATE POLICY "Reyaps are viewable by everyone"
    ON public.reyaps FOR SELECT
    USING (true);

CREATE POLICY "Users can reyap"
    ON public.reyaps FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their reyap"
    ON public.reyaps FOR DELETE
    USING (auth.uid() = user_id);

-- 7. HASHTAGS POLICIES
CREATE POLICY "Hashtags are readable by all"
    ON public.hashtags FOR SELECT
    USING (true);

CREATE POLICY "Hashtag links are readable by all"
    ON public.yap_hashtags FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can tag yaps"
    ON public.yap_hashtags FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- 8. NOTIFICATIONS POLICIES
CREATE POLICY "Users can only read their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can mark their own notifications as read"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 9. INTERACTIONS POLICIES
CREATE POLICY "Users can insert their own interactions"
    ON public.interactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 10. BOOKMARKS POLICIES
CREATE POLICY "Users can only see their own bookmarks"
    ON public.bookmarks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can add bookmarks"
    ON public.bookmarks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove bookmarks"
    ON public.bookmarks FOR DELETE
    USING (auth.uid() = user_id);

-- 11. BLOCKS & REPORTS POLICIES
CREATE POLICY "Users can view their own block list"
    ON public.blocks FOR SELECT
    USING (auth.uid() = blocker_id);

CREATE POLICY "Users can block others"
    ON public.blocks FOR INSERT
    WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock others"
    ON public.blocks FOR DELETE
    USING (auth.uid() = blocker_id);

CREATE POLICY "Users can submit reports"
    ON public.reports FOR INSERT
    WITH CHECK (auth.uid() = reporter_id);
-- ==============================================================================
-- YAPR POSTGRES MIGRATION 003: TRIGGERS & ATOMIC COUNTERS
-- Maintains like_count, reply_count, reyap_count, follower/following_count
-- without needing expensive COUNT(*) queries at request time.
-- ==============================================================================

-- 1. AUTH TRIGGER: Auto-create public.profiles upon auth.users creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (
        id, 
        username, 
        display_name, 
        avatar_url, 
        country_code
    )
    VALUES (
        new.id,
        COALESCE(
            new.raw_user_meta_data->>'username', 
            lower(regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g'))
        ),
        COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/bottts/svg?seed=' || new.id::text),
        COALESCE(new.raw_user_meta_data->>'country_code', 'PK')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. LIKE COUNT TRIGGER
CREATE OR REPLACE FUNCTION public.update_yap_like_count()
RETURNS trigger AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.yaps 
        SET like_count = like_count + 1 
        WHERE id = NEW.yap_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.yaps 
        SET like_count = GREATEST(like_count - 1, 0) 
        WHERE id = OLD.yap_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_like_count ON public.likes;
CREATE TRIGGER trg_update_like_count
    AFTER INSERT OR DELETE ON public.likes
    FOR EACH ROW EXECUTE FUNCTION public.update_yap_like_count();

-- 3. REPLY COUNT TRIGGER
CREATE OR REPLACE FUNCTION public.update_yap_reply_count()
RETURNS trigger AS $$
BEGIN
    IF (TG_OP = 'INSERT') AND NEW.parent_id IS NOT NULL THEN
        UPDATE public.yaps 
        SET reply_count = reply_count + 1 
        WHERE id = NEW.parent_id;
    ELSIF (TG_OP = 'DELETE') AND OLD.parent_id IS NOT NULL THEN
        UPDATE public.yaps 
        SET reply_count = GREATEST(reply_count - 1, 0) 
        WHERE id = OLD.parent_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_reply_count ON public.yaps;
CREATE TRIGGER trg_update_reply_count
    AFTER INSERT OR DELETE ON public.yaps
    FOR EACH ROW EXECUTE FUNCTION public.update_yap_reply_count();

-- 4. REYAP COUNT TRIGGER
CREATE OR REPLACE FUNCTION public.update_yap_reyap_count()
RETURNS trigger AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.yaps 
        SET reyap_count = reyap_count + 1 
        WHERE id = NEW.yap_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.yaps 
        SET reyap_count = GREATEST(reyap_count - 1, 0) 
        WHERE id = OLD.yap_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_reyap_count ON public.reyaps;
CREATE TRIGGER trg_update_reyap_count
    AFTER INSERT OR DELETE ON public.reyaps
    FOR EACH ROW EXECUTE FUNCTION public.update_yap_reyap_count();

-- 5. FOLLOWER & FOLLOWING COUNT TRIGGER
CREATE OR REPLACE FUNCTION public.update_profile_follow_counts()
RETURNS trigger AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        -- Increase followee's follower_count
        UPDATE public.profiles 
        SET follower_count = follower_count + 1 
        WHERE id = NEW.followee_id;

        -- Increase follower's following_count
        UPDATE public.profiles 
        SET following_count = following_count + 1 
        WHERE id = NEW.follower_id;
    ELSIF (TG_OP = 'DELETE') THEN
        -- Decrease followee's follower_count
        UPDATE public.profiles 
        SET follower_count = GREATEST(follower_count - 1, 0) 
        WHERE id = OLD.followee_id;

        -- Decrease follower's following_count
        UPDATE public.profiles 
        SET following_count = GREATEST(following_count - 1, 0) 
        WHERE id = OLD.follower_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_follow_counts ON public.follows;
CREATE TRIGGER trg_update_follow_counts
    AFTER INSERT OR DELETE ON public.follows
    FOR EACH ROW EXECUTE FUNCTION public.update_profile_follow_counts();
-- ==============================================================================
-- YAPR POSTGRES MIGRATION 004: STAGE 1 FEED RANKING FORMULA
-- Implements: score = (likes*1 + replies*3 + reyaps*2) * recency_decay + author_affinity + topic_match
-- With Feed Sliders control & "Why you're seeing this" attribution
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_stage1_feed(
    p_viewer_id UUID DEFAULT NULL,
    p_following_weight NUMERIC DEFAULT 1.5,
    p_viral_weight NUMERIC DEFAULT 1.0,
    p_recency_half_life_hours NUMERIC DEFAULT 12.0,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_country_filter VARCHAR(2) DEFAULT NULL
)
RETURNS TABLE (
    yap_id UUID,
    author_id UUID,
    username VARCHAR(30),
    display_name VARCHAR(60),
    avatar_url TEXT,
    author_country VARCHAR(2),
    is_verified BOOLEAN,
    body TEXT,
    media TEXT[],
    like_count INTEGER,
    reply_count INTEGER,
    reyap_count INTEGER,
    summary TEXT,
    tagged_label VARCHAR(20),
    created_at TIMESTAMPTZ,
    is_liked BOOLEAN,
    is_reyapped BOOLEAN,
    is_bookmarked BOOLEAN,
    is_following BOOLEAN,
    final_score NUMERIC,
    why_label TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH viewer_following AS (
        SELECT followee_id 
        FROM public.follows 
        WHERE follower_id = p_viewer_id
    ),
    viewer_affinities AS (
        -- Calculate interaction affinity with authors in the past 14 days
        SELECT y.author_id AS aff_author_id, COUNT(*) * 0.5 AS affinity_score
        FROM public.interactions i
        JOIN public.yaps y ON i.yap_id = y.id
        WHERE i.user_id = p_viewer_id
          AND i.created_at > (now() - interval '14 days')
          AND i.type IN ('like', 'reply')
        GROUP BY y.author_id
    ),
    base_yaps AS (
        SELECT 
            y.id AS b_yap_id,
            y.author_id AS b_author_id,
            p.username AS b_username,
            p.display_name AS b_display_name,
            p.avatar_url AS b_avatar_url,
            p.country_code AS b_author_country,
            p.is_verified AS b_is_verified,
            y.body AS b_body,
            y.media AS b_media,
            y.like_count AS b_like_count,
            y.reply_count AS b_reply_count,
            y.reyap_count AS b_reyap_count,
            y.summary AS b_summary,
            y.tagged_label AS b_tagged_label,
            y.created_at AS b_created_at,
            -- Check relationship states
            EXISTS(SELECT 1 FROM viewer_following vf WHERE vf.followee_id = y.author_id) AS b_is_following,
            COALESCE(va.affinity_score, 0.0) AS b_affinity_score,
            -- Recency age in hours
            EXTRACT(EPOCH FROM (now() - y.created_at)) / 3600.0 AS age_hours
        FROM public.yaps y
        JOIN public.profiles p ON y.author_id = p.id
        LEFT JOIN viewer_affinities va ON va.aff_author_id = y.author_id
        WHERE y.parent_id IS NULL -- Top level yaps only for feed
          AND y.deleted_at IS NULL
          AND (p_country_filter IS NULL OR p.country_code = p_country_filter)
          AND (
            p_viewer_id IS NULL OR NOT EXISTS (
                SELECT 1 FROM public.blocks b
                WHERE (b.blocker_id = p_viewer_id AND b.blocked_id = y.author_id)
                   OR (b.blocker_id = y.author_id AND b.blocked_id = p_viewer_id)
            )
          )
    ),
    scored_yaps AS (
        SELECT 
            b.*,
            -- Recency decay formula: exp(-age / half_life)
            EXP(- (b.age_hours / GREATEST(p_recency_half_life_hours, 1.0))) AS recency_decay,
            -- Raw viral engagement: likes*1 + replies*3 + reyaps*2
            ((b.b_like_count * 1.0 + b.b_reply_count * 3.0 + b.b_reyap_count * 2.0) * p_viral_weight) AS engagement_score,
            -- Following bonus multiplier
            CASE WHEN b.b_is_following THEN (5.0 * p_following_weight) ELSE 0.0 END AS follow_bonus
        FROM base_yaps b
    )
    SELECT 
        s.b_yap_id,
        s.b_author_id,
        s.b_username,
        s.b_display_name,
        s.b_avatar_url,
        s.b_author_country,
        s.b_is_verified,
        s.b_body,
        s.b_media,
        s.b_like_count,
        s.b_reply_count,
        s.b_reyap_count,
        s.b_summary,
        s.b_tagged_label,
        s.b_created_at,
        EXISTS(SELECT 1 FROM public.likes l WHERE l.yap_id = s.b_yap_id AND l.user_id = p_viewer_id) AS is_liked,
        EXISTS(SELECT 1 FROM public.reyaps r WHERE r.yap_id = s.b_yap_id AND r.user_id = p_viewer_id) AS is_reyapped,
        EXISTS(SELECT 1 FROM public.bookmarks bm WHERE bm.yap_id = s.b_yap_id AND bm.user_id = p_viewer_id) AS is_bookmarked,
        s.b_is_following,
        ROUND((s.engagement_score * s.recency_decay + s.follow_bonus + s.b_affinity_score)::numeric, 3) AS final_score,
        CASE 
            WHEN s.b_is_following THEN 'From people you follow'
            WHEN s.b_affinity_score > 1.0 THEN 'Based on your recent likes'
            WHEN s.engagement_score > 10.0 THEN 'Trending on Yapr'
            WHEN p_country_filter IS NOT NULL THEN 'Popular in your region'
            ELSE 'Recommended for you'
        END AS why_label
    FROM scored_yaps s
    ORDER BY final_score DESC, s.b_created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ==============================================================================
-- YAPR POSTGRES MIGRATION 005: FULL-TEXT SEARCH & ROMAN URDU VARIANTS
-- Full text + pg_trgm trigram search with Roman Urdu alias normalization
-- (e.g. khabar -> khabr, acha -> accha, shukriya -> shukria, etc.)
-- ==============================================================================

-- 1. TRIGRAM INDEXES FOR FUZZY MATCHING
CREATE INDEX IF NOT EXISTS idx_yaps_body_trgm ON public.yaps USING gin (body gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm ON public.profiles USING gin (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm ON public.profiles USING gin (display_name gin_trgm_ops);

-- 2. ROMAN URDU NORMALIZATION FUNCTION
-- Normalizes common phonetics and spelling variations in Roman Urdu
CREATE OR REPLACE FUNCTION public.normalize_roman_urdu(input_text TEXT)
RETURNS TEXT AS $$
DECLARE
    cleaned TEXT;
BEGIN
    cleaned := lower(input_text);
    -- Common Roman Urdu character substitutions
    cleaned := regexp_replace(cleaned, 'aa+', 'a', 'g');
    cleaned := regexp_replace(cleaned, 'ee+', 'i', 'g');
    cleaned := regexp_replace(cleaned, 'oo+', 'u', 'g');
    cleaned := regexp_replace(cleaned, 'khab[ae]r', 'khbr', 'g');
    cleaned := regexp_replace(cleaned, 'ac+h+a', 'acha', 'g');
    cleaned := regexp_replace(cleaned, 'shukr?i?y?a', 'shukria', 'g');
    cleaned := regexp_replace(cleaned, 'bhai+y?a?', 'bhai', 'g');
    cleaned := regexp_replace(cleaned, 'kya|kia|kay', 'kya', 'g');
    cleaned := regexp_replace(cleaned, 'muj?he|mujhay', 'mujhe', 'g');
    cleaned := regexp_replace(cleaned, 'tuj?he|tujhay', 'tujhe', 'g');
    cleaned := regexp_replace(cleaned, 'kais[ae]|kes[ae]', 'kese', 'g');
    RETURN cleaned;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. UNIFIED SEARCH FUNCTION
CREATE OR REPLACE FUNCTION public.search_yapr(
    p_query TEXT,
    p_type VARCHAR(20) DEFAULT 'all', -- 'all', 'yaps', 'users', 'hashtags'
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    result_type VARCHAR(20),
    id UUID,
    title VARCHAR(100),
    subtitle TEXT,
    avatar_url TEXT,
    country_code VARCHAR(2),
    similarity_score REAL
) AS $$
DECLARE
    norm_query TEXT;
BEGIN
    norm_query := public.normalize_roman_urdu(p_query);

    -- Search Hashtags
    IF p_type IN ('all', 'hashtags') AND p_query LIKE '#%' THEN
        RETURN QUERY
        SELECT 
            'hashtag'::VARCHAR(20),
            NULL::UUID,
            h.tag::VARCHAR(100),
            (h.total_count || ' yaps')::TEXT,
            NULL::TEXT,
            'PK'::VARCHAR(2),
            similarity(h.tag, p_query) AS score
        FROM public.hashtags h
        WHERE h.tag ILIKE '%' || substring(p_query from 2) || '%'
        ORDER BY score DESC, h.total_count DESC
        LIMIT p_limit;
    END IF;

    -- Search Users / Profiles
    IF p_type IN ('all', 'users') THEN
        RETURN QUERY
        SELECT 
            'user'::VARCHAR(20),
            p.id,
            p.display_name::VARCHAR(100),
            ('@' || p.username || ' Â· ' || p.follower_count || ' followers')::TEXT,
            p.avatar_url,
            p.country_code,
            GREATEST(similarity(p.username, p_query), similarity(p.display_name, p_query)) AS score
        FROM public.profiles p
        WHERE p.username ILIKE '%' || p_query || '%'
           OR p.display_name ILIKE '%' || p_query || '%'
           OR similarity(p.username, p_query) > 0.2
        ORDER BY score DESC
        LIMIT p_limit;
    END IF;

    -- Search Yaps
    IF p_type IN ('all', 'yaps') THEN
        RETURN QUERY
        SELECT 
            'yap'::VARCHAR(20),
            y.id,
            p.display_name::VARCHAR(100),
            y.body,
            p.avatar_url,
            p.country_code,
            similarity(public.normalize_roman_urdu(y.body), norm_query) AS score
        FROM public.yaps y
        JOIN public.profiles p ON y.author_id = p.id
        WHERE y.deleted_at IS NULL
          AND y.parent_id IS NULL
          AND (
            y.body ILIKE '%' || p_query || '%'
            OR similarity(public.normalize_roman_urdu(y.body), norm_query) > 0.15
          )
        ORDER BY score DESC, y.created_at DESC
        LIMIT p_limit;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
