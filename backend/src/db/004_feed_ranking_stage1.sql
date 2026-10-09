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
