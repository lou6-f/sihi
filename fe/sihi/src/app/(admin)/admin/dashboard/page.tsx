"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, BrainCircuit, BookOpen, Activity, TrendingUp, BarChart3 } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats").then((r) => r.json()).then((d) => { setStats(d); setLoading(false); });
  }, []);

  const cards = [
    { label: "Người dùng", value: stats.totalUsers, icon: Users, gradient: "from-violet-500 to-purple-600" },
    { label: "Phỏng vấn", value: stats.totalInterviews, icon: BrainCircuit, gradient: "from-fuchsia-500 to-pink-600" },
    { label: "Tài liệu", value: stats.totalResources, icon: BookOpen, gradient: "from-indigo-500 to-blue-600" },
    { label: "Active hôm nay", value: stats.activeToday, icon: Activity, gradient: "from-green-500 to-emerald-600" },
    { label: "Điểm TB", value: stats.avgScore, icon: TrendingUp, gradient: "from-orange-500 to-amber-600" },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="glass border-0">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-400">{c.label}</p>
                    {loading ? <Skeleton className="h-8 w-16 mt-1" /> : <p className="text-3xl font-bold">{c.value ?? 0}</p>}
                  </div>
                  <div className={`rounded-xl bg-gradient-to-br ${c.gradient} p-2.5`}>
                    <c.icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
