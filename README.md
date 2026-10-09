# Yapr — System Design & Implementation

> A next-generation, high-performance social platform where every post is a **Yap**, built on the **PERN stack** (PostgreSQL / Supabase, Express, React, Node) with **Redis Upstash**, **LavinMQ**, and dual AI models (**Groq & Google Gemini Flash**).

---

## 🎨 Design & Aesthetic

1. **Social Layout (Square Style)**:
   - Clean left-hand navigation sidebar with user mini-profile card, unread notification counters, and **"Circles & Topics"** (colorful community badges like `#Tech`, `#Karachi`, `#PulseAi`, `#Design`).
   - Center feed column with top rounded search bar, "Post Something" composer card, and Yap cards featuring an adaptive multi-photo gallery (tall left photo with stacked right photos).
   - Bottom quick-comment bar with emoji, attachment, and media triggers.
   - Right-hand widget sidebar displaying real-time **Regional Trending Hashtags** (1h & 24h windows), **Who to Follow**, and **Algorithm Insights**.

2. **Color Palette & Theme (PulseAi Electric Royal Blue)**:
   - Primary Brand: Royal Electric Blue (`#2563EB` / `#1D4ED8`)
   - Accent Gradients: `from-blue-600 via-indigo-600 to-sky-500`
   - Background: Soft modern canvas `#F8FAFC`
   - Card Surfaces: Crisp white `#FFFFFF` with subtle shadows and rounded-2xl / rounded-3xl corners
   - AI Pulse Studio with glowing badges and AI assistant actions

---

## 📁 Repository Structure

The project is split into two primary modular directories: `backend` and `frontend`.

```
Yapr/
├── backend/
│   ├── src/
│   │   ├── config/              # Env, Supabase, Redis Upstash, LavinMQ, AI clients
│   │   ├── db/                  # SQL Migrations, RLS policies, Triggers, Seed data
│   │   │   ├── 001_initial_schema.sql
│   │   │   ├── 002_rls_policies.sql
│   │   │   ├── 003_triggers_and_counters.sql
│   │   │   ├── 004_feed_ranking_stage1.sql
│   │   │   ├── 005_search_trgm_roman_urdu.sql
│   │   │   └── seed.sql
│   │   ├── middleware/          # JWT auth, rate limiter (Redis sliding window), errors
│   │   ├── modules/
│   │   │   ├── auth/            # Email OTP & OAuth session mapping
│   │   │   ├── profiles/        # Profiles CRUD & Redis Bloom Filter username checks
│   │   │   ├── yaps/            # Yaps CRUD, 1h edit window, soft deletes, hashtags
│   │   │   ├── feed/            # Stage 1 rule-based scoring with sliders
│   │   │   ├── social/          # Likes, reyaps, follows, bookmarks, report, block
│   │   │   ├── trending/        # Regional trending hashtags (Redis sorted sets 1h/24h)
│   │   │   ├── search/          # pg_trgm full-text + Roman Urdu alias normalization
│   │   │   ├── notifications/   # Hybrid fan-out & notification aggregation engine
│   │   │   ├── ai/              # Dual AI: Gemini Flash + Groq Llama 3.3 summarizer
│   │   │   └── interactions/    # Batch event logging (dwell_ms, views, skips)
│   │   ├── realtime/            # Socket.io live notification server
│   │   └── workers/             # Async background workers (Email, Fan-out, Summaries)
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/                 # API client with automatic fallbacks
│   │   ├── context/             # AuthContext (session + demo switcher), SocketContext
│   │   ├── components/
│   │   │   ├── layout/          # Sidebar, Topbar (search + Roman Urdu), RightWidgetSidebar
│   │   │   ├── yaps/            # YapComposer, YapCard, YapMediaGrid, ReplyThreadModal
│   │   │   ├── feed/            # FeedTabs, FeedSlidersModal
│   │   │   ├── ai/              # AiStudioModal (PulseAi assistant)
│   │   │   └── auth/            # AuthModal (OTP, OAuth, Bloom filter check)
│   │   └── pages/               # FeedPage, ExplorePage, NotificationsPage, ProfilePage, BookmarksPage
│   └── package.json
└── README.md
```

---

## 🌿 Git Branch Mapping

The codebase was crafted so that every feature cleanly maps to your planned git branch roadmap:

### Setup
- `chore/project-setup`: Root `.gitignore`, `backend/package.json`, `frontend/package.json`, TypeScript and Vite setup.
- `chore/supabase-schema-rls`: All SQL migrations in `backend/src/db/` (`001` through `005` + `seed.sql`).
- `chore/ci-and-env`: `.env.example` in root, backend, and frontend.

### v1 (Core Application)
- `feat/auth-email-otp`: `backend/src/modules/auth/` + `frontend/src/components/auth/AuthModal.tsx`
- `feat/oauth-google-facebook`: Supabase OAuth handlers & modal buttons
- `feat/profiles-country`: `backend/src/modules/profiles/` + ISO 3166 country dropdown
- `feat/yaps-crud`: `backend/src/modules/yaps/` + composer + soft delete + 1h edit window
- `feat/media-upload`: `backend/src/modules/yaps/` + `frontend/src/components/yaps/YapMediaGrid.tsx`
- `feat/follow-system`: `backend/src/modules/social/` + follow toggle & follower counts
- `feat/likes-replies-reyaps`: Atomic Postgres triggers in `003_triggers_and_counters.sql` + social endpoints
- `feat/feed-stage1`: Stored procedure in `004_feed_ranking_stage1.sql` + `FeedPage.tsx`
- `feat/report-block`: `backend/src/modules/social/` report and block mutations

### v2 (Real-time and Speed)
- `feat/express-backend`: Express application setup in `backend/src/index.ts`
- `feat/redis-cache`: `backend/src/config/redis.ts` (Upstash REST & ioredis with fallback)
- `feat/lavinmq-workers`: `backend/src/config/queue.ts` & `backend/src/workers/`
- `feat/websocket-notifications`: `backend/src/realtime/socket.ts` + `SocketContext.tsx`
- `feat/notification-aggregation`: `backend/src/modules/notifications/`
- `feat/hashtags-trending`: Redis sorted sets (1h & 24h buckets) in `backend/src/modules/trending/`
- `feat/search`: `005_search_trgm_roman_urdu.sql` + `backend/src/modules/search/`
- `feat/smtp-otp-service`: `backend/src/workers/email.worker.ts` with nodemailer
- `feat/rate-limiting`: Redis token bucket sliding window middleware in `backend/src/middleware/rateLimiter.ts`

### v3 (Smart Features)
- `feat/ai-summarizer`: Dual LLM fallback (Gemini Flash -> Groq Llama 3.3) in `backend/src/config/ai.ts` + `AiStudioModal.tsx`
- `feat/embeddings-pgvector`: `vector(1536)` column on `yaps` table in `001_initial_schema.sql`
- `feat/bloom-filter-usernames`: Counting Bloom Filter in `backend/src/utils/bloomFilter.ts`
- `feat/interaction-logging`: Batch interaction logging in `backend/src/modules/interactions/`
- `feat/feed-sliders`: Interactive algorithm sliders in `frontend/src/components/feed/FeedSlidersModal.tsx`

---

## 🔑 Required API Keys & Environment Variables

When you are ready to connect your production or staging services, fill out the following keys in `backend/.env` and `frontend/.env`:

### 1. Supabase (Database & Auth)
- `SUPABASE_URL`: Your Supabase Project URL (`https://<project-ref>.supabase.co`)
- `SUPABASE_ANON_KEY`: Supabase public `anon` key (used by frontend and public read clients)
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase `service_role` secret key (used by backend to bypass RLS for async workers)
- `SUPABASE_JWT_SECRET`: Found in **Project Settings -> API -> JWT Secret** (used to verify bearer tokens in Express and Socket.io)

### 2. Redis / Upstash (Caching, Counters & Bloom Filter)
- Either **Upstash Redis REST** (Recommended for serverless/cloud):
  - `UPSTASH_REDIS_REST_URL`: e.g. `https://your-database.upstash.io`
  - `UPSTASH_REDIS_REST_TOKEN`: Upstash REST token
- Or standard **Redis URL**:
  - `REDIS_URL`: e.g. `redis://default:<password>@<host>:<port>`

### 3. AI Providers (Summaries & AI Polish)
- **Groq API**:
  - `GROQ_API_KEY`: e.g. `gsk_...`
  - `GROQ_MODEL`: Default `llama-3.3-70b-versatile` (or `mixtral-8x7b-32768`)
- **Google Gemini API**:
  - `GEMINI_API_KEY`: Google AI Studio API key
  - `GEMINI_MODEL`: Default `gemini-2.0-flash` (or `gemini-1.5-flash`)

### 4. Message Queue (LavinMQ / CloudAMQP)
- `LAVINMQ_URL`: e.g. `amqps://<user>:<pass>@<host>/<vhost>` (CloudAMQP) or local `amqp://guest:guest@localhost:5672`

### 5. SMTP Service (For Custom Email OTPs in v2)
- `SMTP_HOST`: e.g. `smtp.mailtrap.io` or `smtp.resend.com`
- `SMTP_PORT`: e.g. `587` or `465`
- `SMTP_USER`: SMTP username
- `SMTP_PASS`: SMTP password
- `SMTP_FROM`: `"Yapr Team" <no-reply@yapr.app>`

---

## 🚀 How to Run

### Step 1: Database Setup (Supabase)
Run the SQL scripts located in `backend/src/db/` in your Supabase SQL Editor in numerical order:
1. `001_initial_schema.sql` (Tables & Extensions)
2. `002_rls_policies.sql` (Row Level Security)
3. `003_triggers_and_counters.sql` (Atomic counters & Auth triggers)
4. `004_feed_ranking_stage1.sql` (Stage 1 Feed Scoring procedure)
5. `005_search_trgm_roman_urdu.sql` (Trigram search & Roman Urdu normalization)
6. `seed.sql` (Optional: Demo users, yaps, hashtags)

### Step 2: Start Backend
```bash
cd backend
npm run build
npm start
```
*(Or for hot-reloading development: `npm run dev`)*

Backend will start on `http://localhost:5000` with WebSocket support.

### Step 3: Start Frontend
```bash
cd frontend
npm run dev
```
Frontend will be running on `http://localhost:5173`.
