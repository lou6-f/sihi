# SiHi — Nền tảng luyện phỏng vấn IT thông minh

> **Tư duy thuật toán, bản lĩnh phỏng vấn, tự tin bứt phá**

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS v4, ShadCN UI |
| **Backend** | Next.js API Routes, Prisma 6 ORM |
| **Database** | PostgreSQL 16 + pgvector |
| **AI** | Google Gemini API (gemini-3.5-flash) |
| **Auth** | NextAuth v4 (Credentials + JWT) |
| **Realtime** | WebSocket server (ws + jose) |
| **STT** | PhoWhisper (Docker) |
| **Animation** | Motion v12 |

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 16 with pgvector extension
- Google Gemini API key

### 1. Install dependencies
```bash
cd sihi && npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your values:
#   DATABASE_URL, NEXTAUTH_SECRET, WS_JWT_SECRET, GEMINI_API_KEYS
```

### 3. Setup database
```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. Run development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Default admin:** `admin@sihi.vn` / `Admin@123`

## 📁 Project Structure

```
sihi/
├── src/
│   ├── app/              # Next.js App Router (pages + API routes)
│   │   ├── (admin)/      # Admin dashboard pages
│   │   ├── (auth)/       # Login, Register, Forgot Password
│   │   ├── (main)/       # Main app pages (dashboard, interview, etc.)
│   │   └── api/          # 27 API endpoints
│   ├── components/       # React components (ShadCN UI + custom)
│   ├── hooks/            # React hooks (auth, speech, WS, interview)
│   ├── lib/              # Shared utilities (prisma, auth, validators)
│   ├── providers/        # AI + Email provider layer
│   ├── services/         # Business logic (10 service classes)
│   ├── prompts/          # AI prompt templates
│   └── types/            # TypeScript definitions
├── ws-server/            # Standalone WebSocket server
├── stt-service/          # PhoWhisper STT (Docker)
└── docker-compose.yml
```

## 🔑 Key Features

- **AI-powered interviews** — Gemini generates adaptive questions
- **CV analysis** — Upload PDF, AI extracts and analyzes skills
- **Real-time evaluation** — Each answer scored with detailed feedback
- **Comprehensive reports** — Score gauge, skill radar, readiness level
- **Resource recommendations** — RAG-based learning material suggestions
- **Multi-key management** — API key pool with rotation and cooldown
- **Admin dashboard** — User management, AI monitoring, resource CRUD
- **Email OTP** — 3-step forgot password flow

## 🛡 Security

- bcryptjs password hashing (12 rounds)
- JWT session with NextAuth v4
- Separate WS JWT (5min TTL, jose HS256)
- File uploads: private storage, authenticated streaming
- Zod input validation on all endpoints
- Role-based access control (USER / ADMIN)
- API keys never in DB/logs/responses

## 📜 License

Private project — All rights reserved.
