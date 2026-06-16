// ═══════════════════════════════════════
// User Types
// ═══════════════════════════════════════

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  school?: string | null;
  major?: string | null;
  yearOfStudy?: number | null;
  itField?: string | null;
  emailVerified?: Date | null;
  isActive: boolean;
  createdAt: string;
}

export interface AdminUser extends UserProfile {
  _count: {
    interviews: number;
  };
}
