# SiHi — Nền tảng luyện phỏng vấn IT thông minh

> **Tư duy thuật toán, bản lĩnh phỏng vấn, tự tin bứt phá**

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS v4, ShadCN UI |
| **Backend** | Next.js API Routes, Prisma 6 ORM |
| **Database** | PostgreSQL 16 + pgvector |
| **AI** | Google Gemini API |
| **Auth** | NextAuth v4 (Credentials + JWT) |
| **Realtime** | WebSocket server (ws + jose) |
| **STT** | PhoWhisper (Docker) |
| **Animation** | Motion v12 |

---

## ⚡ Hướng dẫn cài đặt

### Yêu cầu

- [Node.js 18+](https://nodejs.org)
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (để chạy PostgreSQL, WS Server, STT)
- Google Gemini API key (miễn phí tại [aistudio.google.com](https://aistudio.google.com))

---

### Bước 1 — Clone và cài dependencies

```bash
git clone https://github.com/lou6-f/sihi.git
cd sihi
npm install
```

---

### Bước 2 — Tạo file `.env`

```bash
cp .env.example .env
```

Mở file `.env` và chỉnh các giá trị **bắt buộc**:

| Biến | Mô tả | Ví dụ |
|------|-------|-------|
| `DATABASE_URL` | Kết nối PostgreSQL | `postgresql://postgres:sihi_dev_password@localhost:5432/sihi` |
| `NEXTAUTH_SECRET` | Secret cho session (random 32 ký tự) | `openssl rand -base64 32` |
| `WS_JWT_SECRET` | Secret cho WebSocket JWT (khác NEXTAUTH_SECRET) | `openssl rand -base64 32` |
| `GEMINI_API_KEYS` | Gemini API key(s), cách nhau bởi dấu phẩy | `AIzaSy...` |

> 💡 Tạo secret nhanh trên Windows: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

---

### Bước 3 — Khởi động các service bằng Docker

Docker chạy 3 service nền:
- **PostgreSQL** (port 5432) — cơ sở dữ liệu
- **WebSocket Server** (port 3001) — xử lý phỏng vấn real-time
- **STT Service / PhoWhisper** (port 8001) — chuyển giọng nói thành văn bản

```bash
docker compose up -d
```

Kiểm tra các service đã chạy:

```bash
docker compose ps
```

> ⚠️ Lần đầu chạy sẽ mất vài phút để build image PhoWhisper (tải model AI ~500MB).
> STT service **không bắt buộc** — nếu không cần nhận diện giọng nói, bỏ qua cũng được.

---

### Bước 4 — Khởi tạo database

```bash
npx prisma db push
npx prisma db seed
```

> `db seed` tạo tài khoản admin mặc định.

---

### Bước 5 — Chạy Next.js app

```bash
npm run dev
```

Mở trình duyệt: [http://localhost:3000](http://localhost:3000)

**Tài khoản admin mặc định:** `admin@sihi.vn` / `Admin@123`

---

## 🐳 Docker chạy những gì?

```
docker compose up -d
│
├── postgres       (port 5432) ✅ BẮT BUỘC — database
├── ws-server      (port 3001) ✅ BẮT BUỘC — WebSocket interview
└── stt-service    (port 8001) ⚡ TÙY CHỌN — nhận diện giọng nói
```

**Next.js app (port 3000) KHÔNG có trong Docker** → chạy riêng bằng `npm run dev`.

Tóm lại: **2 terminal** khi phát triển:
```bash
# Terminal 1 — chạy 1 lần
docker compose up -d

# Terminal 2 — chạy mỗi khi code
npm run dev
```

---

## 📁 Cấu trúc project

```
sihi/
├── src/
│   ├── app/              # Next.js App Router (pages + API routes)
│   │   ├── (admin)/      # Trang quản trị
│   │   ├── (auth)/       # Đăng nhập, Đăng ký, Quên mật khẩu
│   │   ├── (main)/       # Trang chính (dashboard, phỏng vấn, CV...)
│   │   └── api/          # API endpoints
│   ├── components/       # React components
│   ├── hooks/            # Custom hooks
│   ├── lib/              # Utilities (prisma, auth, validators)
│   ├── providers/        # AI + Email provider abstraction
│   ├── services/         # Business logic
│   ├── prompts/          # AI prompt templates
│   └── types/            # TypeScript types
├── ws-server/            # WebSocket server (Node.js standalone)
├── stt-service/          # PhoWhisper STT (Python + FastAPI)
├── docker-compose.yml
└── .env.example          # Template biến môi trường
```

---

## 🔑 Tính năng

- **Phỏng vấn AI** — Gemini sinh câu hỏi adaptive theo CV và JD
- **Phân tích CV** — Upload PDF, AI trích xuất và phân tích kỹ năng
- **Đánh giá thời gian thực** — Mỗi câu trả lời được chấm điểm chi tiết
- **Báo cáo toàn diện** — Điểm tổng, tiêu chí chi tiết, mức độ sẵn sàng
- **Gợi ý tài liệu** — RAG-based recommendation system
- **Quản lý admin** — User management, AI monitoring, resource CRUD

---

## 🛡 Bảo mật

- bcryptjs password hashing (12 rounds)
- JWT session với NextAuth v4
- WS JWT riêng biệt (TTL 5 phút, jose HS256)
- File upload: private storage, stream có xác thực
- Zod validation trên tất cả endpoints
- Role-based access control (USER / ADMIN)

---

## 📜 License

Private project — All rights reserved.
