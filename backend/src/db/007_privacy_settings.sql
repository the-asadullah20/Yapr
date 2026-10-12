-- 007_privacy_settings.sql
-- Add privacy settings columns to profiles table

ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS who_can_see_dp VARCHAR(20) NOT NULL DEFAULT 'everyone',
    ADD COLUMN IF NOT EXISTS who_can_tag VARCHAR(20) NOT NULL DEFAULT 'everyone';

-- Index for privacy filtering
CREATE INDEX IF NOT EXISTS idx_profiles_who_can_tag ON public.profiles (who_can_tag);
CREATE INDEX IF NOT EXISTS idx_profiles_who_can_see_dp ON public.profiles (who_can_see_dp);
