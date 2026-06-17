// ─── App ────────────────────────────────────────────────────────────────────

export const APP_NAME = "SiHi";

export const APP_SLOGAN =
  "Tư duy thuật toán, bản lĩnh phỏng vấn, tự tin bứt phá";

// ─── File Upload ────────────────────────────────────────────────────────────

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const ALLOWED_FILE_TYPES = ["application/pdf"];

// ─── OTP ────────────────────────────────────────────────────────────────────

export const OTP_LENGTH = 6;

export const OTP_EXPIRY_MINUTES = 5;

export const OTP_MAX_ATTEMPTS = 5;

export const OTP_RATE_LIMIT_SECONDS = 60;

// ─── Interview Fields ───────────────────────────────────────────────────────

export const INTERVIEW_FIELDS = [
  { value: "FRONTEND", label: "Lập trình Frontend" },
  { value: "BACKEND", label: "Lập trình Backend" },
  { value: "FULLSTACK", label: "Lập trình Fullstack" },
  { value: "MOBILE", label: "Lập trình Mobile" },
  { value: "DATA_SCIENCE", label: "Khoa học dữ liệu" },
  { value: "DEVOPS", label: "DevOps" },
  { value: "AI_ML", label: "Trí tuệ nhân tạo / ML" },
  { value: "SECURITY", label: "An ninh mạng" },
  { value: "DATABASE", label: "Cơ sở dữ liệu" },
  { value: "SYSTEM_DESIGN", label: "Thiết kế hệ thống" },
] as const;

// ─── Interview Levels ───────────────────────────────────────────────────────

export const INTERVIEW_LEVELS = [
  { value: "INTERN", label: "Intern" },
  { value: "FRESHER", label: "Fresher" },
  { value: "JUNIOR", label: "Junior" },
  { value: "MIDDLE", label: "Middle" },
  { value: "SENIOR", label: "Senior" },
  { value: "LEAD", label: "Tech Lead" },
] as const;

// ─── Question Categories ────────────────────────────────────────────────────

export const QUESTION_CATEGORIES = [
  { value: "ALGORITHM", label: "Thuật toán" },
  { value: "DATA_STRUCTURE", label: "Cấu trúc dữ liệu" },
  { value: "OOP", label: "Lập trình hướng đối tượng" },
  { value: "DESIGN_PATTERN", label: "Design Pattern" },
  { value: "DATABASE", label: "Cơ sở dữ liệu" },
  { value: "NETWORKING", label: "Mạng máy tính" },
  { value: "OS", label: "Hệ điều hành" },
  { value: "SYSTEM_DESIGN", label: "Thiết kế hệ thống" },
  { value: "BEHAVIORAL", label: "Câu hỏi hành vi" },
  { value: "CODING", label: "Lập trình thực hành" },
] as const;

// ─── Readiness Levels ───────────────────────────────────────────────────────

export const READINESS_LEVELS = [
  {
    value: "NOT_READY",
    label: "Chưa sẵn sàng",
    color: "text-red-500",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  {
    value: "NEEDS_IMPROVEMENT",
    label: "Cần cải thiện",
    color: "text-orange-500",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
  {
    value: "ALMOST_READY",
    label: "Gần sẵn sàng",
    color: "text-yellow-500",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
  },
  {
    value: "READY",
    label: "Sẵn sàng",
    color: "text-green-500",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  {
    value: "EXCELLENT",
    label: "Xuất sắc",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
] as const;
