"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Record<string, string | number | boolean | null>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    fetch("/api/users/me").then((r) => r.json()).then((d) => { setProfile(d); setLoading(false); });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: profile.name, school: profile.school, major: profile.major,
        yearOfStudy: profile.yearOfStudy ? Number(profile.yearOfStudy) : undefined,
        itField: profile.itField,
      }),
    });
    setSaving(false);
    if (res.ok) toast.success("Cập nhật hồ sơ thành công!"); else toast.error("Lỗi cập nhật");
  };

  const handlePwChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) { toast.error("Mật khẩu xác nhận không khớp"); return; }
    setPwSaving(true);
    const res = await fetch("/api/users/me/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
    });
    const data = await res.json();
    setPwSaving(false);
    if (res.ok) { toast.success("Đổi mật khẩu thành công!"); setPwForm({ currentPassword: "", newPassword: "", confirm: "" }); }
    else toast.error(data.error);
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold">Hồ sơ cá nhân</h1>
        <p className="text-zinc-400">Quản lý thông tin và mật khẩu</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="glass border-0">
          <CardHeader>
            <CardTitle>Thông tin cá nhân</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{profile.email as string}</Badge>
              {profile.emailVerified ? <CheckCircle className="h-4 w-4 text-green-400" /> : <span className="text-xs text-yellow-400">Chưa xác thực</span>}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Họ và tên</Label>
                <Input value={(profile.name as string) || ""} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Trường</Label>
                <Input value={(profile.school as string) || ""} onChange={(e) => setProfile({ ...profile, school: e.target.value })} placeholder="Đại học..." />
              </div>
              <div className="space-y-2">
                <Label>Ngành</Label>
                <Input value={(profile.major as string) || ""} onChange={(e) => setProfile({ ...profile, major: e.target.value })} placeholder="Khoa học Máy tính..." />
              </div>
              <div className="space-y-2">
                <Label>Năm học</Label>
                <Input type="number" min={1} max={10} value={(profile.yearOfStudy as number) || ""} onChange={(e) => setProfile({ ...profile, yearOfStudy: parseInt(e.target.value) || null })} />
              </div>
              <div className="space-y-2">
                <Label>Lĩnh vực IT</Label>
                <Select value={(profile.itField as string) || ""} onValueChange={(v) => setProfile({ ...profile, itField: v })}>
                  <SelectTrigger><SelectValue placeholder="Chọn lĩnh vực" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FRONTEND">Frontend</SelectItem>
                    <SelectItem value="BACKEND">Backend</SelectItem>
                    <SelectItem value="FULLSTACK">Fullstack</SelectItem>
                    <SelectItem value="DATA">Data</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="bg-violet-600 hover:bg-violet-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Lưu thay đổi
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <Separator className="bg-zinc-800" />

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="glass border-0">
          <CardHeader><CardTitle>Đổi mật khẩu</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handlePwChange} className="space-y-3 max-w-md">
              <div className="space-y-2">
                <Label>Mật khẩu hiện tại</Label>
                <Input type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Mật khẩu mới</Label>
                <Input type="password" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Xác nhận mật khẩu mới</Label>
                <Input type="password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} required />
              </div>
              <Button type="submit" disabled={pwSaving} variant="outline">
                {pwSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Đổi mật khẩu
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
