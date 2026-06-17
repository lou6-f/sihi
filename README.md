# SiHi — Nền tảng luyện phỏng vấn IT thông minh

> **"Tư duy thuật toán, bản lĩnh phỏng vấn, tự tin bứt phá"**

SiHi là nền tảng luyện phỏng vấn IT bằng AI dành cho sinh viên Việt Nam — hỗ trợ phân tích CV, phỏng vấn adaptive theo lĩnh vực & cấp độ, đánh giá đa chiều, báo cáo chi tiết và gợi ý tài liệu học tập.

---

## 🏗 Kiến trúc

```
SiHi/                          ← monorepo root
├── fe/
│   └── sihi/                  # Next.js 15 app  (:3000)
├── be/
│   ├── ws-server/             # WebSocket server (:3001)
│   ├── stt-service/           # PhoWhisper STT   (:8001)
│   └── cv-module/             # CV phân tích PDF (:8002)
├── docker-compose.yml         # Orchestration cho be/ services
├── .env                       # Biến môi trường cho Docker
└── .env.example               # Template — copy thành .env
```

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS v4, ShadCN UI, Motion v12 |
| **Backend** | Next.js API Routes, Prisma 6 ORM |
| **Database** | PostgreSQL 16 + pgvector (Supabase) |
| **Auth** | NextAuth v4 (Credentials + JWT) |
| **AI** | Google Gemini API (adaptive Q&A, CV analysis, embedding) |
| **Realtime** | WebSocket server (Node.js + jose) |
| **STT** | PhoWhisper (Docker) + Web Speech API fallback |
| **TTS** | Web Speech Synthesis API (browser) |
| **Storage** | Local disk (dev) / Supabase Storage (prod) |
| **Email** | Nodemailer SMTP / Mock (dev) |

---

## ⚡ Cài đặt & Chạy

### Yêu cầu

- [Node.js 20+](https://nodejs.org)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- PostgreSQL — dùng [Supabase](https://supabase.com) (miễn phí) hoặc local
- [Google Gemini API key](https://aistudio.google.com) (miễn phí)

---

### Bước 1 — Clone repo

```bash
git clone https://github.com/lou6-f/sihi.git
cd sihi
```

---

### Bước 2 — Cài dependencies cho Next.js app

```bash
cd fe/sihi
npm install
```

---

### Bước 3 — Tạo file `.env`

**File 1 — cho Docker services** (`SiHi/.env`):
```bash
cp .env.example .env
# Điền WS_JWT_SECRET
```

**File 2 — cho Next.js app** (`SiHi/fe/sihi/.env`):
```bash
cd fe/sihi
cp .env.example .env
```

Mở `fe/sihi/.env` và điền các biến **bắt buộc**:

| Biến | Mô tả |
|------|-------|
| `DATABASE_URL` | Connection string PostgreSQL (Supabase pooler) |
| `DIRECT_URL` | Direct connection (dùng cho migrations) |
| `NEXTAUTH_SECRET` | Random 32-byte secret |
| `WS_JWT_SECRET` | Secret cho WebSocket JWT (khác `NEXTAUTH_SECRET`) |
| `GEMINI_API_KEYS` | Gemini API key(s), nhiều key cách nhau bởi dấu phẩy |

> 💡 Tạo secret: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
>
> ⚠️ `WS_JWT_SECRET` phải **giống nhau** ở cả `SiHi/.env` và `SiHi/fe/sihi/.env`

---

### Bước 4 — Khởi tạo database

```bash
cd fe/sihi
npx prisma db push
npx prisma db seed
```

> `db seed` tạo tài khoản mặc định — xem bảng [Tài khoản mặc định](#-tài-khoản-mặc-định) bên dưới.

---

### Bước 5 — Chạy project

**Cách A — Dev** (khuyên dùng khi phát triển):

```bash
# Terminal 1: chạy backend services (ws-server + stt-service)
docker compose up -d

# Terminal 2: chạy Next.js với hot reload
cd fe/sihi
npm run dev
```

> Hot reload tức thì. Lần đầu `docker compose up` tải model PhoWhisper ~500MB (5–10 phút).
> App vẫn chạy bình thường trong lúc chờ — ghi âm dùng Web Speech API làm fallback.

**Cách B — Full Docker** (demo, người khác chạy thử):

```bash
docker compose --profile full up -d
```

Mở trình duyệt: **[http://localhost:3000](http://localhost:3000)**

---

## 🔑 Tài khoản mặc định

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@sihi.vn | Admin@123 |
| User | user@sihi.vn | User@123 |

> OTP email (chế độ mock): xem console terminal thay vì hộp thư.

---

## 🐳 Docker services

```
docker compose up -d
│
├── ws-server     (port 3001)  ✅ WebSocket — phỏng vấn real-time
├── stt-service   (port 8001)  ⚡ STT PhoWhisper tiếng Việt (tùy chọn)
└── cv-module     (port 8002)  ⚡ Phân tích CV nâng cao (tùy chọn)
```

> **Next.js app (port 3000) không nằm trong Docker** → chạy riêng bằng `npm run dev`.

---

## 🎯 Tính năng chính

### Phỏng vấn AI
- **Sinh câu hỏi adaptive** — Gemini điều chỉnh độ khó theo CV, JD, lĩnh vực và cấp độ
- **4 chế độ phỏng vấn** — Tổng quát / CV only / JD only / CV + JD
- **STT/TTS tích hợp** — Nghe câu hỏi bằng giọng đọc, trả lời bằng micro
- **Bảo vệ phiên 3 lớp**:
  - Lớp 1 — Dialog tiếp tục / hủy khi bắt đầu phiên mới
  - Lớp 2 — Inactivity dialog sau 10 phút không thao tác (countdown 5 phút)
  - Lớp 3 — `sendBeacon` tự động đánh dấu `ABANDONED` khi đóng tab

### Quản lý & Phân tích
- **Phân tích CV** — Upload PDF, AI trích xuất kỹ năng và so sánh với JD
- **Báo cáo toàn diện** — Điểm tổng, 4 tiêu chí chính, điểm mạnh/yếu, STAR evaluation, lộ trình học
- **Lịch sử phỏng vấn** — Phân loại: ✅ Hoàn thành / 🔄 Đang diễn ra / ⚪ Bỏ dở
- **Phân tích kỹ năng** — Biểu đồ tiến trình, top & weak skills, mức độ sẵn sàng
- **Gợi ý tài liệu** — RAG-based recommendation (Gemini Embedding + pgvector)

### Trang quản trị (`/admin`)
- **Quản lý người dùng** — Phân quyền USER / ADMIN
- **AI Monitoring** — Theo dõi API calls, token usage, chi phí
- **Quản lý tài liệu** — CRUD resources, duyệt đề xuất từ AI curator
- **Quản lý mẫu phỏng vấn** — Templates theo lĩnh vực & cấp độ

### UX
- **Top progress bar** — Thanh tải tím xuất hiện ngay khi chuyển trang
- **Dark mode** — Giao diện tối với glassmorphism
- **Responsive** — Mobile-first sidebar navigation

---

## 📊 Trạng thái phỏng vấn

| Trạng thái | Ý nghĩa | Hiển thị |
|-----------|---------|---------|
| `PREPARING` / `CONNECTING` | Đang khởi tạo | 🔄 Đang diễn ra |
| `COMPLETED` | Hoàn thành đủ câu hỏi | ✅ Hoàn thành |
| `ABANDONED` | Bỏ dở — thoát tab / hết inactivity | ⚪ Bỏ dở |
| `CANCELLED` | Kết thúc sớm thủ công | ⚪ Bỏ dở |
| `ERROR` | Lỗi hệ thống | ⚪ Bỏ dở |

---

## 🛡 Bảo mật

- bcryptjs password hashing (12 rounds)
- JWT session với NextAuth v4
- WS JWT riêng biệt (TTL 5 phút, jose HS256)
- File CV lưu trong `data/` (private), không phải `public/`
- Zod validation trên toàn bộ API endpoints
- Role-based access control (USER / ADMIN)
- OTP email verification cho đăng ký và đặt lại mật khẩu
- API keys Gemini không log, không lưu DB, không gửi về frontend

---

## 🔧 Development

```bash
cd fe/sihi

# Prisma Studio — GUI quản lý database
npx prisma studio

# TypeScript check
npx tsc --noEmit

# Reset database (xóa toàn bộ data)
npx prisma migrate reset

# Xem log Docker services
docker compose logs -f ws-server
docker compose logs -f stt-service
```

---

## 📜 License

Private project — All rights reserved.
