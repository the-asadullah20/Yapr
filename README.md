# Yapr

A modern, high-performance distributed social platform built on the PERN stack (PostgreSQL / Supabase, Express, React 18, Node.js), powered by Redis Upstash, LavinMQ AMQP message queues, Socket.io real-time streaming, and dual AI inference (Google Gemini Flash Lite and Groq Llama/GPT-OSS).

---

## Overview

Yapr is designed as an event-driven social networking system where every user post is a **Yap**. The platform implements advanced engineering patterns including:

- **Stage-1 Rule-Based Feed Ranking**: Dynamic scoring stored procedure taking into account recency decay, social affinity, engagement ratios, and real-time custom user slider weights.
- **Dual AI Engine**: High-speed AI Summarization, multi-language translation (Urdu, Roman Urdu, Hindi, Arabic, Spanish, French, German, Chinese, Japanese), and AI Post Polish with automatic hashtag curation.
- **Hybrid Fan-Out Real-Time Engine**: Push-on-write model for standard users paired with pull-on-read for high-follower accounts, streaming instant notifications via WebSocket.
- **Probabilistic Verification**: In-memory counting Bloom Filter for sub-millisecond username availability lookups before hitting the persistent database layer.
- **Trigram Search with Roman Urdu Normalization**: `pg_trgm` fuzzy matching integrated with phonetic Roman Urdu alias resolution.
- **Nested Thread Conversation**: Hierarchical replies with vertical tree connectors, username mention auto-tagging, and dynamic reply pagination.
- **Adaptive Media & Lightbox View**: Aspect-ratio preserving media galleries with full-screen lightbox modal navigation.

---

## System Architecture

```
                    +------------------------------------+
                    |        React 18 / Vite SPA        |
                    | (Tailwind CSS, Lucide, Socket.io)  |
                    +-----------------+------------------+
                                      |
                     REST / HTTP      |      WebSocket
                                      v
                    +-----------------+------------------+
                    |       Node.js / Express API        |
                    |    (TypeScript, JWT Auth, RLS)     |
                    +--------+------------------+--------+
                             |                  |
              +--------------+                  +--------------+
              |                                                |
              v                                                v
+-----------------------------+                  +-----------------------------+
|    Supabase / PostgreSQL    |                  |        Redis (Upstash)      |
|  - Relational Schema        |                  |  - Sliding-Window Limits    |
|  - RLS Policies & Triggers  |                  |  - Trending Sorted Sets     |
|  - Stage-1 Feed Function    |                  |  - Bloom Filter Usernames   |
|  - Trigram Search & Vectors |                  |  - Session / Cache Layer    |
+-----------------------------+                  +-----------------------------+
              |                                                |
              +-----------------------+------------------------+
                                      |
                                      v
                    +-----------------+------------------+
                    |          LavinMQ (AMQP)            |
                    |      Event Broker & Queues         |
                    +-----------------+------------------+
                                      |
                    +-----------------+------------------+
                    |        Async Worker Fleet          |
                    |  - Fan-out Notification Worker     |
                    |  - SMTP Email / OTP Worker         |
                    |  - Gemini & Groq AI Workers        |
                    +------------------------------------+
```

---

## Tech Stack

| Domain | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18 / TypeScript / Vite | Single Page Application with optimized bundle splitting |
| **Styling & Design** | Tailwind CSS / Lucide Icons | Responsive brutalist-modern interface, dark mode engine |
| **Backend Runtime** | Node.js / Express / TypeScript | High-throughput REST API and WebSocket gateway |
| **Database & Auth** | Supabase (PostgreSQL 15) | Relational schema, Row Level Security (RLS), atomic triggers |
| **Media Storage** | Supabase Storage (S3-compatible) | User avatars, post media attachments, multi-photo grids |
| **Cache & Counters** | Upstash Redis (REST & TCP) | Sub-millisecond trending leaderboards, rate limits, Bloom filter |
| **Message Broker** | LavinMQ / AMQP | Decoupled asynchronous worker queue for notifications and fan-out |
| **Real-time Protocol** | Socket.io | Bi-directional WebSocket channels for instant notification push |
| **AI Intelligence** | Gemini 3.5 Flash Lite + Groq OSS | Dual-model fallback engine for summaries, translations, and polish |
| **Search Engine** | PostgreSQL `pg_trgm` | Trigram fuzzy indexing and Roman Urdu dialect synonym matching |

---

## Core Capabilities

### 1. Feed Ranking & Algorithm Sliders
- Posts are evaluated through an in-database scoring algorithm:
  `Score = (Likes * W_like) + (Replies * W_reply) + (Reyaps * W_reyap) + (Affinity * W_aff) - (Age_Hours * Decay_Rate)`
- Users can tune their personal feed sliders (Recency vs. Popularity, Regional Bias, Media Heavy) in real time to rebalance their timeline.

### 2. Conversational Threads & Mentions
- Tree-structured nested replies displaying parent-child conversational context.
- Single-click reply action that automatically pre-fills `@username` target handle.
- Reply collapse and expand pagination for dense discussions.

### 3. Media Delivery & Lightbox Modal
- Preservation of original aspect ratios preventing unseemly portrait photo crops.
- Zero-latency Lightbox Modal supporting keyboard navigation (ESC, arrow keys), image index tracking, and full uncompressed viewing.

### 4. Language Translation & AI Summaries
- Real-time post translation into 10 target dialects: Urdu, Roman Urdu, English, Hindi, Arabic, Spanish, French, German, Chinese, Japanese.
- Single-click contextual post summaries with stripped metadata and zero markdown syntax artifacts.
- Post Composer AI Polisher enhancing tone, cadence, and auto-injecting relevant trending tags.

### 5. Security & Privacy
- Row Level Security (RLS) policies isolating user records at database level.
- Account visibility controls (Public vs. Private) with follower approval gates.
- Blocking and content reporting infrastructure with administrator review tables.
- Cryptographic password hashing and multi-factor OTP verification.

---

## Project Structure

```
Yapr/
|-- backend/
|   |-- src/
|   |   |-- config/              # Supabase, Redis, LavinMQ, AI clients, environment
|   |   |-- db/                  # SQL migrations, RLS policies, triggers, stored procedures
|   |   |   |-- 001_initial_schema.sql
|   |   |   |-- 002_rls_policies.sql
|   |   |   |-- 003_triggers_and_counters.sql
|   |   |   |-- 004_feed_ranking_stage1.sql
|   |   |   |-- 005_search_trgm_roman_urdu.sql
|   |   |   +-- seed.sql
|   |   |-- middleware/          # JWT auth, Redis sliding-window rate limiter, error handling
|   |   |-- modules/
|   |   |   |-- ai/              # AI endpoints: summarize, translate, polish
|   |   |   |-- auth/            # Authentication, OTP verification, password recovery
|   |   |   |-- feed/            # Stage-1 feed generator with dynamic slider weights
|   |   |   |-- interactions/    # Interaction telemetry logging (dwell, view, skip)
|   |   |   |-- media/           # S3 bucket media upload service
|   |   |   |-- notifications/   # Notification aggregation and retrieval service
|   |   |   |-- profiles/        # Profiles CRUD, Bloom filter username lookup
|   |   |   |-- search/          # Trigram and Roman Urdu keyword search
|   |   |   |-- social/          # Likes, reyaps, bookmarks, follows, block, report
|   |   |   |-- trending/        # Redis sorted set trending topic aggregator
|   |   |   +-- yaps/            # Post lifecycle: create, edit window, soft delete, replies
|   |   |-- realtime/            # Socket.io connection manager and user room emitter
|   |   |-- utils/               # Bloom filter, token generators, formatters
|   |   +-- workers/             # Background queue consumers (notification fan-out)
|   |-- package.json
|   +-- tsconfig.json
|
|-- frontend/
|   |-- src/
|   |   |-- api/                 # Strongly-typed API client
|   |   |-- components/
|   |   |   |-- ai/              # AI Studio modal
|   |   |   |-- auth/            # Authentication and registration modals
|   |   |   |-- common/          # Lightbox modal, reusable interface primitives
|   |   |   |-- feed/            # Feed sliders modal, feed filters
|   |   |   |-- layout/          # Responsive navigation sidebar, topbar, trending widget
|   |   |   +-- yaps/            # YapCard, YapComposer, YapMediaGrid, ReplyThreadModal
|   |   |-- context/             # AuthContext, SocketContext, ThemeContext
|   |   |-- pages/               # Feed, Explore, Notifications, Profile, Bookmarks
|   |   |-- types/               # TypeScript interface and type declarations
|   |   +-- utils/               # Formatting and localization utilities
|   |-- index.html
|   |-- package.json
|   +-- vite.config.ts
|
+-- README.md
```

---

## Environment Configuration

Configure the following variables in `backend/.env`:

```ini
# Application
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret

# Redis / Upstash
UPSTASH_REDIS_REST_URL=https://your-upstash-endpoint.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-rest-token

# LavinMQ / AMQP
LAVINMQ_URL=amqp://guest:guest@localhost:5672
AMQP_QUEUE_NOTIFICATIONS=yapr.notifications

# AI Providers
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=openai/gpt-oss-20b
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.5-flash-lite

# SMTP Credentials
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-pass
SMTP_FROM="Yapr" <no-reply@yapr.app>
```

Configure the following in `frontend/.env`:

```ini
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

---

## Installation & Setup

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)
- Supabase Project or local PostgreSQL instance
- Upstash Redis account or local Redis server

### 1. Database Provisioning
Execute migrations located in `backend/src/db/` sequentially within your database SQL query editor:

1. `001_initial_schema.sql` - Core schema, tables, vector extensions, foreign keys
2. `002_rls_policies.sql` - Row-level security enforcement rules
3. `003_triggers_and_counters.sql` - Atomic counter updates and user creation triggers
4. `004_feed_ranking_stage1.sql` - Feed scoring stored procedure
5. `005_search_trgm_roman_urdu.sql` - Trigram index and synonym normalization
6. `seed.sql` - Seed profiles, tags, and sample discussions

### 2. Backend Initialization
```bash
cd backend
npm install
npm run build
npm run dev
```
The REST API and WebSocket gateway will bind to `http://localhost:5000`.

### 3. Frontend Initialization
```bash
cd frontend
npm install
npm run dev
```
The client application will serve on `http://localhost:5173`.

---

## API Surface

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/otp/request` | Issue email login OTP code |
| `POST` | `/api/auth/otp/verify` | Verify OTP code and return JWT token |
| `GET` | `/api/feed` | Retrieve ranked feed with optional slider weights |
| `POST` | `/api/yaps` | Create a Yap or reply |
| `GET` | `/api/yaps/:id` | Fetch specific Yap with author profile |
| `GET` | `/api/yaps/:id/replies` | Fetch nested conversation replies |
| `POST` | `/api/social/like/:yapId` | Toggle like state atomically |
| `POST` | `/api/social/follow/:userId` | Follow or unfollow user |
| `GET` | `/api/trending` | Fetch regional trending topics (1h / 24h buckets) |
| `GET` | `/api/search` | Execute trigram search with Roman Urdu aliases |
| `POST` | `/api/ai/summarize` | Generate plain-text post summary |
| `POST` | `/api/ai/translate` | Translate post content into target dialect |
| `POST` | `/api/ai/polish` | Enhance content tone and generate hashtags |
| `POST` | `/api/media/upload` | Upload media attachment to Supabase bucket |

---

## License

This project is licensed under the MIT License.
