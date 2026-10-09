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
