// ═══════════════════════════════════════
// Resource Types
// ═══════════════════════════════════════

export interface Resource {
  id: string;
  title: string;
  description?: string | null;
  summary?: string | null;
  type: "ARTICLE" | "ROADMAP" | "VIDEO" | "EXTERNAL_LINK";
  url: string;
  field: "FRONTEND" | "BACKEND" | "DATA" | "FULLSTACK";
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  status: "PENDING" | "APPROVED" | "REJECTED";
  addedBy?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export interface ResourceRecommendation {
  id: string;
  reason: string;
  relevanceScore: number;
  resource: Resource;
}
