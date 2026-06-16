import { z } from "zod";

// ═══════════════════════════════════════
// Auth
// ═══════════════════════════════════════

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Tên phải có ít nhất 2 ký tự")
    .max(100, "Tên không được quá 100 ký tự")
    .trim(),
  email: z
    .string()
    .email("Email không hợp lệ")
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
    .regex(/[A-Z]/, "Mật khẩu phải chứa ít nhất 1 chữ hoa")
    .regex(/[0-9]/, "Mật khẩu phải chứa ít nhất 1 chữ số"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email("Email không hợp lệ")
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, "Vui lòng nhập mật khẩu"),
});

// ═══════════════════════════════════════
// Profile
// ═══════════════════════════════════════

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Tên phải có ít nhất 2 ký tự")
    .max(100, "Tên không được quá 100 ký tự")
    .trim()
    .optional(),
  school: z
    .string()
    .max(200, "Tên trường không được quá 200 ký tự")
    .trim()
    .optional(),
  major: z
    .string()
    .max(200, "Tên ngành không được quá 200 ký tự")
    .trim()
    .optional(),
  yearOfStudy: z
    .number()
    .int()
    .min(1, "Vui lòng chọn năm học")
    .max(6, "Vui lòng chọn năm học")
    .optional(),
  itField: z
    .string()
    .max(100, "Lĩnh vực IT không được quá 100 ký tự")
    .trim()
    .optional(),
});

// ═══════════════════════════════════════
// Password
// ═══════════════════════════════════════

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, "Vui lòng nhập mật khẩu hiện tại"),
  newPassword: z
    .string()
    .min(8, "Mật khẩu mới phải có ít nhất 8 ký tự")
    .regex(/[A-Z]/, "Mật khẩu mới phải chứa ít nhất 1 chữ hoa")
    .regex(/[0-9]/, "Mật khẩu mới phải chứa ít nhất 1 chữ số"),
});

// ═══════════════════════════════════════
// Forgot Password (OTP flow)
// ═══════════════════════════════════════

export const forgotPasswordRequestSchema = z.object({
  email: z
    .string()
    .email("Email không hợp lệ")
    .toLowerCase()
    .trim(),
});

export const forgotPasswordVerifySchema = z.object({
  email: z
    .string()
    .email("Email không hợp lệ")
    .toLowerCase()
    .trim(),
  otp: z
    .string()
    .length(6, "Mã OTP phải có đúng 6 ký tự"),
});

export const forgotPasswordResetSchema = z.object({
  email: z
    .string()
    .email("Email không hợp lệ")
    .toLowerCase()
    .trim(),
  otp: z
    .string()
    .length(6, "Mã OTP phải có đúng 6 ký tự"),
  newPassword: z
    .string()
    .min(8, "Mật khẩu mới phải có ít nhất 8 ký tự")
    .regex(/[A-Z]/, "Mật khẩu mới phải chứa ít nhất 1 chữ hoa")
    .regex(/[0-9]/, "Mật khẩu mới phải chứa ít nhất 1 chữ số"),
});

// ═══════════════════════════════════════
// CV
// ═══════════════════════════════════════

const MAX_CV_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_CV_TYPES = ["application/pdf"];

export const cvUploadSchema = z.object({
  fileName: z
    .string()
    .min(1, "Tên file không được để trống"),
  fileSize: z
    .number()
    .max(MAX_CV_SIZE, "File CV không được vượt quá 5MB")
    .positive("Kích thước file phải lớn hơn 0"),
  mimeType: z
    .string()
    .refine(
      (type) => ALLOWED_CV_TYPES.includes(type),
      "Chỉ chấp nhận file PDF"
    ),
});

// ═══════════════════════════════════════
// Interview
// ═══════════════════════════════════════

export const createInterviewSchema = z.object({
  field: z.enum(["FRONTEND", "BACKEND", "DATA", "FULLSTACK"], {
    error: "Lĩnh vực phỏng vấn không hợp lệ",
  }),
  level: z.enum(["INTERN", "FRESHER", "JUNIOR"], {
    error: "Cấp độ phỏng vấn không hợp lệ",
  }),
  cvId: z
    .string()
    .min(1)
    .optional(),
  // JD-Based Interview fields
  targetRole: z.string().max(200).trim().optional(),
  jobDescription: z.string().max(5000).trim().optional(),
  jdMode: z.enum(["CV_JD", "JD_ONLY", "CV_ONLY", "GENERAL"]).optional(),
});

// ═══════════════════════════════════════
// Resource
// ═══════════════════════════════════════

export const createResourceSchema = z.object({
  title: z
    .string()
    .min(1, "Tiêu đề không được để trống")
    .max(300, "Tiêu đề không được quá 300 ký tự")
    .trim(),
  description: z
    .string()
    .max(2000, "Mô tả không được quá 2000 ký tự")
    .trim()
    .optional(),
  type: z.enum(["ARTICLE", "ROADMAP", "VIDEO", "EXTERNAL_LINK"], {
    error: "Loại tài nguyên không hợp lệ",
  }),
  url: z
    .string()
    .url("URL không hợp lệ"),
  field: z.enum(["FRONTEND", "BACKEND", "DATA", "FULLSTACK"], {
    error: "Lĩnh vực không hợp lệ",
  }),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"], {
    error: "Cấp độ không hợp lệ",
  }),
});

// ═══════════════════════════════════════
// Type exports
// ═══════════════════════════════════════

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordRequestInput = z.infer<typeof forgotPasswordRequestSchema>;
export type ForgotPasswordVerifyInput = z.infer<typeof forgotPasswordVerifySchema>;
export type ForgotPasswordResetInput = z.infer<typeof forgotPasswordResetSchema>;
export type CvUploadInput = z.infer<typeof cvUploadSchema>;
export type CreateInterviewInput = z.infer<typeof createInterviewSchema>;
export type CreateResourceInput = z.infer<typeof createResourceSchema>;
