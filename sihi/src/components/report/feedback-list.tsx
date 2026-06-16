"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, Lightbulb } from "lucide-react";

interface FeedbackItem {
  type: "strength" | "weakness" | "suggestion";
  content: string;
}

interface FeedbackListProps {
  items: FeedbackItem[];
}

const ICONS = {
  strength: { icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10", label: "Điểm mạnh" },
  weakness: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", label: "Cần cải thiện" },
  suggestion: { icon: Lightbulb, color: "text-yellow-400", bg: "bg-yellow-500/10", label: "Gợi ý" },
};

export function FeedbackList({ items }: FeedbackListProps) {
  const grouped = {
    strength: items.filter((i) => i.type === "strength"),
    weakness: items.filter((i) => i.type === "weakness"),
    suggestion: items.filter((i) => i.type === "suggestion"),
  };

  return (
    <div className="space-y-4">
      {(["strength", "weakness", "suggestion"] as const).map((type) => {
        const config = ICONS[type];
        const group = grouped[type];
        if (group.length === 0) return null;
        const Icon = config.icon;

        return (
          <div key={type}>
            <h3 className={`mb-2 flex items-center gap-2 text-sm font-semibold ${config.color}`}>
              <Icon className="h-4 w-4" />
              {config.label}
            </h3>
            <div className="space-y-2">
              {group.map((item, i) => (
                <Card key={i} className={`${config.bg} border-0`}>
                  <CardContent className="p-3">
                    <p className="text-sm leading-relaxed">{item.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
