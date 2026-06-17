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

### Bước 3 — Chọn cách chạy

#### Cách A — Dev (khuyên dùng khi code)

Docker chạy 3 service nền, Next.js chạy riêng bằng npm:

```bash
# Terminal 1: chạy services (postgres, ws-server, stt)
docker compose up -d

# Terminal 2: chạy Next.js với hot reload
npm run dev
```

> Hot reload tức thì, debug dễ dàng.

#### Cách B — Full Docker (khi demo hoặc người khác chạy thử)

Chạy **tất cả** bằng 1 lệnh duy nhất (bao gồm cả Next.js):

```bash
docker compose --profile full up -d
```

> ⚠️ Lần đầu build mất 3–5 phút. Không có hot reload.

Mở trình duyệt: [http://localhost:3000](http://localhost:3000)

---

### Bước 4 — Khởi tạo database

> **Chỉ cần chạy 1 lần** khi mới clone về:

```bash
npx prisma db push
npx prisma db seed
```

> `db seed` tạo tài khoản admin mặc định: `admin@sihi.vn` / `Admin@123`

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

### Phỏng vấn AI
- **Sinh câu hỏi adaptive** — Gemini điều chỉnh độ khó theo CV và JD theo thời gian thực
- **Chế độ phỏng vấn linh hoạt** — Tổng quát / CV only / JD only / CV + JD
- **STT/TTS tích hợp** — Hỏi bằng giọng nói, trả lời bằng micro
- **Bảo vệ phiên phỏng vấn** — 3 lớp xử lý khi người dùng thoát giữa chừng:
  - **Lớp 1** — Dialog nhắc tiếp tục / hủy khi bắt đầu phiên mới
  - **Lớp 2** — Inactivity dialog sau 10 phút không thao tác (countdown 5 phút)
  - **Lớp 3** — `sendBeacon` tự động đánh dấu `ABANDONED` khi đóng tab

### Quản lý & Phân tích
- **Phân tích CV** — Upload PDF, AI trích xuất và so sánh với JD
- **Báo cáo toàn diện** — Điểm tổng, tiêu chí chi tiết, gợi ý cải thiện, lộ trình học
- **Lịch sử phỏng vấn** — Phân loại: Hoàn thành / Đang diễn ra / Bỏ dở
- **Phân tích kỹ năng** — Biểu đồ tiến trình, top & weak skills, mức độ sẵn sàng
- **Gợi ý tài liệu** — RAG-based recommendation system

### Trang quản trị (`/admin`)
- **Quản lý người dùng** — Phân quyền USER / ADMIN
- **AI Monitoring** — Theo dõi API calls, chi phí, token usage
- **Quản lý tài liệu** — CRUD resources, duyệt đề xuất từ AI curator
- **Quản lý mẫu phỏng vấn** — Templates theo lĩnh vực & cấp độ

### UX
- **Top progress bar** — Thanh tải tím xuất hiện ngay khi điều hướng giữa các trang
- **Dark mode** — Giao diện tối với glassmorphism
- **Responsive** — Mobile-first sidebar navigation

---

## 🛡 Bảo mật

- bcryptjs password hashing (12 rounds)
- JWT session với NextAuth v4
- WS JWT riêng biệt (TTL 5 phút, jose HS256)
- File upload: private storage, stream có xác thực
- Zod validation trên tất cả endpoints
- Role-based access control (USER / ADMIN)
- OTP email verification cho đăng ký và đặt lại mật khẩu

---

## 📊 Trạng thái phỏng vấn

| Trạng thái | Ý nghĩa | Hiển thị |
|-----------|---------|---------|
| `PREPARING` / `CONNECTING` | Đang khởi tạo | 🔄 Đang diễn ra |
| `COMPLETED` | Hoàn thành đủ câu hỏi | ✅ Hoàn thành |
| `ABANDONED` | Bỏ dở (thoát tab / hết giờ inactivity) | ⚪ Bỏ dở |
| `CANCELLED` | Kết thúc sớm thủ công | ⚪ Bỏ dở |
| `ERROR` | Lỗi hệ thống | ⚪ Bỏ dở |

---

## 📜 License

Private project — All rights reserved.
