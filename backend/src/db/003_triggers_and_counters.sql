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
