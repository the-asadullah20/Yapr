-- 006_follow_requests.sql
-- Table for storing follow requests for private accounts

CREATE TABLE IF NOT EXISTS public.follow_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (requester_id, target_id),
    CHECK (requester_id <> target_id)
);

CREATE INDEX IF NOT EXISTS idx_follow_requests_target ON public.follow_requests(target_id);
CREATE INDEX IF NOT EXISTS idx_follow_requests_requester ON public.follow_requests(requester_id);

ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view follow requests they sent or received"
    ON public.follow_requests FOR SELECT
    USING (auth.uid() = requester_id OR auth.uid() = target_id);

CREATE POLICY "Users can create follow requests"
    ON public.follow_requests FOR INSERT
    WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can delete follow requests"
    ON public.follow_requests FOR DELETE
    USING (auth.uid() = requester_id OR auth.uid() = target_id);
