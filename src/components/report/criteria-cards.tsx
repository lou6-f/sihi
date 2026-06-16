"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface CriterionScore {
  name: string;
  score: number;
  maxScore: number;
  feedback: string;
}

interface CriteriaCardsProps {
  criteria: CriterionScore[];
}

const SCORE_COLORS: Record<string, string> = {
  high: "text-green-400",
  medium: "text-violet-400",
  low: "text-yellow-400",
  critical: "text-red-400",
};

function getLevel(score: number, max: number) {
  const pct = (score / max) * 100;
  if (pct >= 80) return "high";
  if (pct >= 60) return "medium";
  if (pct >= 40) return "low";
  return "critical";
}

export function CriteriaCards({ criteria }: CriteriaCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {criteria.map((c) => {
        const level = getLevel(c.score, c.maxScore);
        const pct = Math.round((c.score / c.maxScore) * 100);
        return (
          <Card key={c.name} className="glass border-0">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{c.name}</CardTitle>
                <Badge variant="outline" className={SCORE_COLORS[level]}>
                  {c.score}/{c.maxScore}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={pct} className="h-1.5 mb-2" />
              <p className="text-xs text-zinc-500 leading-relaxed">{c.feedback}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
