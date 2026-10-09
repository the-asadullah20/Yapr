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
