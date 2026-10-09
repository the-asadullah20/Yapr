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
            ('@' || p.username || ' · ' || p.follower_count || ' followers')::TEXT,
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
