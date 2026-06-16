# SiHi — Luyện phỏng vấn IT bằng AI

> **"Tư duy thuật toán, bản lĩnh phỏng vấn, tự tin bứt phá"**

SiHi là nền tảng luyện phỏng vấn IT bằng AI dành cho sinh viên Việt Nam — hỗ trợ voice chat tiếng Việt, phân tích CV, đánh giá năng lực adaptive và gợi ý tài liệu học tập.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 + ShadCN UI |
| Database | PostgreSQL 16 + pgvector + Prisma |
| Auth | NextAuth v4 (Credentials + JWT) |
| AI | Google Gemini API |
| Realtime | WebSocket server (Node.js) :3001 |
| STT | PhoWhisper (Docker) + Web Speech API fallback |
| TTS | Web Speech Synthesis API (browser) |
| Email | Mock (dev) / Resend (prod) |

---

## Cấu trúc project

```
SiHi/
├── sihi/              # Next.js app (:3000)
├── ws-server/         # WebSocket server (:3001)
├── stt-service/       # PhoWhisper STT (:8001)
├── docker-compose.yml # Chạy ws-server + stt-service
├── .env               # Biến môi trường cho Docker
└── .env.example       # Template — copy thành .env
```

---

## Cài đặt & Chạy

### 1. Yêu cầu

- [Node.js 20+](https://nodejs.org)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- PostgreSQL — dùng [Supabase](https://supabase.com) (miễn phí) hoặc local
- [Google Gemini API key](https://aistudio.google.com) (miễn phí)

---

### 2. Clone và cài dependencies

```bash
git clone https://github.com/lou6-f/sihi.git
cd sihi
cd sihi && npm install
```

---

### 3. Tạo file `.env`

**File 1 — cho Docker** (`SiHi/.env`):
```bash
cp .env.example .env
```
Chỉnh `WS_JWT_SECRET` thành 1 chuỗi random:
```env
WS_JWT_SECRET="chuoi-random-32-ky-tu"
```

**File 2 — cho Next.js app** (`SiHi/sihi/.env`): tạo mới với nội dung:
```env
DATABASE_URL="postgresql://user:password@host:5432/sihi"
NEXTAUTH_SECRET="chuoi-random-32-ky-tu"
WS_JWT_SECRET="chuoi-random-32-ky-tu-giong-file-tren"
GEMINI_API_KEYS="your-gemini-api-key"
AI_PROVIDER=gemini
GEMINI_MODEL="gemini-2.0-flash"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_WS_URL="ws://localhost:3001"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_STT_FALLBACK=webspeech
EMAIL_PROVIDER=mock
UPLOAD_DIR="./data/uploads"
```

> 💡 Tạo secret: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

> ⚠️ `WS_JWT_SECRET` phải **giống nhau** ở cả 2 file `.env`

---

### 4. Khởi tạo database

```bash
cd sihi
npx prisma db push
npx prisma db seed
```

---

### 5. Chạy project

**Cách A — Dev** (khuyên dùng khi code):

```bash
# Terminal 1: Docker (ws-server + stt)
docker compose up -d

# Terminal 2: Next.js
cd sihi && npm run dev
```

**Cách B — Full Docker** (demo, chạy thử):

```bash
docker compose --profile full up -d
```

Mở trình duyệt: **http://localhost:3000**

> ⚠️ Lần đầu `docker compose up` sẽ tải model PhoWhisper ~500MB (5-10 phút).
> App vẫn chạy bình thường trong khi chờ — ghi âm dùng Web Speech API làm fallback.

---

## Tài khoản mặc định

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@sihi.vn | Admin@123 |
| User | user@sihi.vn | User@123 |

> OTP email: xem terminal console (mock mode mặc định)

---

## Tính năng chính

- **Phỏng vấn AI adaptive** — Gemini sinh câu hỏi theo CV, JD, lĩnh vực, cấp độ
- **Phân tích CV** — Upload PDF, AI trích xuất kỹ năng và đánh giá
- **Đánh giá đa chiều** — 4 tiêu chí chính + 4 tiêu chí hồ sơ năng lực
- **Báo cáo chi tiết** — điểm số, điểm mạnh/yếu, STAR evaluation, gợi ý học tập
- **Lịch sử & Phân tích** — theo dõi tiến độ theo thời gian
- **Quản lý CV** — upload, đặt tên, sắp xếp thứ tự ưu tiên
- **Admin dashboard** — quản lý user, tài liệu, AI monitoring

---

## Development

```bash
# Prisma Studio — GUI quản lý DB
cd sihi && npx prisma studio

# TypeScript check
npx tsc --noEmit

# Xem log Docker
docker compose logs -f ws
docker compose logs -f stt
```

---

## Security

- `NEXTAUTH_SECRET` và `WS_JWT_SECRET` là 2 secret riêng biệt
- API keys Gemini không bao giờ log, lưu DB hay gửi về frontend
- File CV lưu trong `data/` (private), không phải `public/`
- WS JWT token TTL 5 phút, lưu trong memory
