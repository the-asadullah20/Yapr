-- ==============================================================================
-- YAPR POSTGRES SEED DATA
-- Pre-populates realistic profiles, yaps, hashtags, and follows for dev/testing
-- ==============================================================================

-- 1. SEED PROFILES (Mock UUIDs corresponding to demo users)
INSERT INTO public.profiles (id, username, display_name, bio, avatar_url, country_code, follower_count, following_count, is_verified)
VALUES
    ('a1111111-1111-1111-1111-111111111111', 'asadahmad', 'Asad Ahmad', 'Building Yapr 🚀 | Full Stack Engineer & System Designer', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'PK', 1420, 310, true),
    ('b2222222-2222-2222-2222-222222222222', 'panfengshui', 'Pan Feng Shui', 'Work hard, travel harder. Sharing knowledge with colleagues worldwide 🌏', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'SG', 12400, 450, true),
    ('c3333333-3333-3333-3333-333333333333', 'clarakim', 'Clara Kim', 'Fitness enthusiast, UX designer & AI researcher 💡', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'US', 8920, 210, false),
    ('d4444444-4444-4444-4444-444444444444', 'hamza_tech', 'Hamza Khan', 'Karachi Tech Scene updates. Building on Node and Postgres! #Karachi #Tech', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'PK', 3450, 680, true),
    ('e5555555-5555-5555-5555-555555555555', 'zainab_writes', 'Zainab Qureshi', 'Journalist & Storyteller. Roman Urdu aur poetry lover ✨', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', 'PK', 5120, 420, false)
ON CONFLICT (id) DO NOTHING;

-- 2. SEED HASHTAGS
INSERT INTO public.hashtags (tag, total_count)
VALUES
    ('Tech', 84),
    ('Karachi', 62),
    ('PulseAi', 45),
    ('Cricket', 98),
    ('Design', 31),
    ('Yapr', 150)
ON CONFLICT (tag) DO UPDATE SET total_count = EXCLUDED.total_count;

-- 3. SEED YAPS
INSERT INTO public.yaps (id, author_id, body, media, like_count, reply_count, reyap_count, summary, created_at)
VALUES
    (
        'f1111111-1111-1111-1111-111111111111',
        'b2222222-2222-2222-2222-222222222222',
        'One of the perks of working in an international company is sharing knowledge with your colleagues across continents! Great brainstorm session today on next-gen distributed systems. #Tech #Design',
        ARRAY['https://images.unsplash.com/photo-1497366216548-37526070297c?w=800', 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800'],
        120,
        25,
        18,
        'Pan shares insights on cross-continental collaboration and modern distributed systems brainstorming with international colleagues.',
        now() - interval '2 hours'
    ),
    (
        'f2222222-2222-2222-2222-222222222222',
        'c3333333-3333-3333-3333-333333333333',
        'A Great Way To Generate All The Motivation You Need To Get Fit: Start small, track consistency over intensity, and let dopamine reward your habit loops! 💪🏃‍♀️',
        ARRAY['https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800'],
        85,
        14,
        9,
        'Key fitness takeaway: Prioritize daily consistency and small wins over sporadic high-intensity workouts to build lasting habits.',
        now() - interval '4 hours'
    ),
    (
        'f3333333-3333-3333-3333-333333333333',
        'd4444444-4444-4444-4444-444444444444',
        'Karachi ka mausam aaj zabardast hai! Aur Yapr ka Stage 1 scoring algorithm test ho raha hai. Likes x 1 + Replies x 3 + Reyaps x 2 with recency decay is working flawlessly! #Karachi #Yapr #Tech',
        ARRAY[]::TEXT[],
        230,
        42,
        35,
        'Hamza reports great weather in Karachi and confirms that Yapr Stage 1 feed scoring formula is live and functioning as designed.',
        now() - interval '1 hour'
    ),
    (
        'f4444444-4444-4444-4444-444444444444',
        'a1111111-1111-1111-1111-111111111111',
        'Welcome to Yapr! Speak your mind freely. We built this with Express, Supabase Postgres, Redis Upstash, LavinMQ and dual AI models (Groq + Gemini). Check out the feed sliders to tune your algorithm! 🚀 #Yapr #PulseAi',
        ARRAY['https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800'],
        450,
        68,
        52,
        'Official launch yap: Overview of Yapr modern architecture, dual AI summarizers, and user-controlled feed algorithm sliders.',
        now() - interval '30 minutes'
    )
ON CONFLICT (id) DO NOTHING;

-- 4. SEED HASHTAG MAPPINGS
INSERT INTO public.yap_hashtags (tag, yap_id, country_code)
VALUES
    ('Tech', 'f1111111-1111-1111-1111-111111111111', 'SG'),
    ('Design', 'f1111111-1111-1111-1111-111111111111', 'SG'),
    ('Karachi', 'f3333333-3333-3333-3333-333333333333', 'PK'),
    ('Yapr', 'f3333333-3333-3333-3333-333333333333', 'PK'),
    ('Yapr', 'f4444444-4444-4444-4444-444444444444', 'PK'),
    ('PulseAi', 'f4444444-4444-4444-4444-444444444444', 'PK')
ON CONFLICT DO NOTHING;

-- 5. SEED FOLLOWS
INSERT INTO public.follows (follower_id, followee_id)
VALUES
    ('a1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222'),
    ('a1111111-1111-1111-1111-111111111111', 'd4444444-4444-4444-4444-444444444444'),
    ('c3333333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;
