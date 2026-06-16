# SiHi — Luyện phỏng vấn IT bằng AI

> **"Tư duy thuật toán, bản lĩnh phỏng vấn, tự tin bứt phá"**

SiHi là nền tảng luyện phỏng vấn IT bằng AI dành cho sinh viên Việt Nam, hỗ trợ voice chat tiếng Việt, phân tích CV, đánh giá năng lực adaptive và gợi ý tài liệu học tập.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 + ShadCN UI |
| Database | PostgreSQL 16 + pgvector + Prisma |
| Auth | NextAuth v4 (Credentials + JWT) |
| AI | Google Gemini API (gemini-3.1-flash-lite) |
| Realtime | Standalone WebSocket server (ws) :3001 |
| STT | PhoWhisper (Docker + FastAPI) |
| TTS | Web Speech Synthesis API |
| Email | Mock (dev) / Resend (prod) |

---

## Cấu trúc project

```
D:\SiHi
├── sihi/              # Next.js app (:3000)
├── ws-server/         # WebSocket server (:3001)
├── stt-service/       # PhoWhisper STT FastAPI (:8001)
└── docker-compose.yml
```

---

## Cài đặt

### 1. Yêu cầu

- Node.js 20+
- PostgreSQL 16 (khuyến nghị Supabase)
- Docker + Docker Compose (cho PhoWhisper STT)

### 2. Clone và cài dependencies

```bash
cd D:\SiHi

# Next.js app
cd sihi && npm install

# WS server
cd ../ws-server && npm install
```

### 3. Cấu hình môi trường

```bash
cd D:\SiHi\sihi
cp .env.example .env
```

Chỉnh sửa `.env` — các biến **bắt buộc**:

```env
DATABASE_URL="postgresql://user:password@host:5432/sihi"
NEXTAUTH_SECRET="<random-32-bytes>"         # openssl rand -base64 32
WS_JWT_SECRET="<random-32-bytes-different>" # PHẢI khác NEXTAUTH_SECRET
GEMINI_API_KEYS="your-gemini-api-key"
AI_PROVIDER=gemini
```

### 4. Database setup

```bash
cd D:\SiHi\sihi

# Push schema lên DB
npx prisma db push

# Seed dữ liệu mẫu (tài khoản admin, templates, resources)
npx prisma db seed
```

### 5. Khởi động STT service (Docker)

```bash
cd D:\SiHi
docker-compose up stt -d
```

### 6. Khởi động WS server

```bash
cd D:\SiHi\ws-server
npm run dev    # :3001
```

### 7. Khởi động Next.js app

```bash
cd D:\SiHi\sihi
npm run dev    # :3000
```

Truy cập: http://localhost:3000

---

## Tài khoản mặc định

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@sihi.vn | Admin@123 |
| User | user@sihi.vn | User@123 |

> OTP email: check terminal console (mock mode mặc định)

---

## Tính năng chính

### AI Interview (v5.0 Adaptive)
- **8 adaptive actions**: ASK_NEW_QUESTION, FOLLOW_UP, DEEP_DIVE, GIVE_HINT, REDUCE_DIFFICULTY, CLARIFY_ANSWER, EXPLAIN_BRIEFLY, PROJECT_DISCUSSION
- **3-step unknown handling**: gợi ý → đơn giản hóa → giải thích và chuyển chủ đề
- **JD-based interview**: CV+JD / JD Only / General modes
- **Interview Plan**: AI tạo kế hoạch câu hỏi trước khi bắt đầu

### Phân tích & Đánh giá
- **6-dimension scoring**: Kiến thức kỹ thuật, Tư duy logic, Kinh nghiệm dự án, Giao tiếp, Khả năng học hỏi, Tự tin
- **STAR Evaluation** cho behavioral questions
- **Vocal Analysis**: WPM, filler words từ transcript
- **Skill Gaps**: CRITICAL / IMPORTANT / OPTIONAL
- **Learning Roadmap**: topic ưu tiên + resources

### Analytics
- Line chart theo dõi xu hướng điểm theo thời gian
- Soft Skills Radar chart
- Tên kỹ năng hiển thị tiếng Việt

---

## Environment Variables đầy đủ

Xem file [sihi/.env.example](sihi/.env.example)

---

## Security notes

- `NEXTAUTH_SECRET` và `WS_JWT_SECRET` là **2 secret khác nhau**
- API keys Gemini **không bao giờ** được log, lưu DB, hay gửi về frontend
- File CV/avatar lưu trong `data/` (private, không phải `public/`)
- WS JWT token lưu trong memory, không phải localStorage

---

## Development commands

```bash
# TypeScript check
cd sihi && npx tsc --noEmit

# Prisma
npx prisma studio          # GUI quản lý DB
npx prisma db push         # Push schema changes
npx prisma db seed         # Re-seed data

# Build production
npm run build
```
