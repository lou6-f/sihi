"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Save, CheckCircle2, Camera, Trash2, Upload, ShieldCheck, GraduationCap, Building2, Code2, Lock } from "lucide-react";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────
const YEAR_LABELS: Record<number, string> = {
  1: "Sinh viên năm 1", 2: "Sinh viên năm 2", 3: "Sinh viên năm 3",
  4: "Sinh viên năm 4", 5: "Sinh viên năm 5", 6: "Đã tốt nghiệp",
};
const FIELD_LABELS: Record<string, string> = {
  FRONTEND: "Frontend", BACKEND: "Backend", FULLSTACK: "Fullstack", DATA: "Data",
};

// ─── Helpers ─────────────────────────────────────────────────
function getAvatarUrl(avatar: string | null | undefined): string | null {
  if (!avatar) return null;
  if (avatar.startsWith("http")) return avatar;
  return `/api/uploads/${avatar.replace(/\\/g, "/")}`;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

// ─── Avatar Upload ────────────────────────────────────────────
function AvatarUploader({
  currentAvatar, name, onUploaded,
}: {
  currentAvatar: string | null | undefined;
  name: string | null | undefined;
  onUploaded: (a: string | null) => void;
}) {
  const { update } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [hovered, setHovered] = useState(false);

  const avatarUrl = preview ?? getAvatarUrl(currentAvatar);
  const initials = getInitials(name);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast.error("Chỉ hỗ trợ JPG, PNG, WEBP, GIF"); return;
    }
    if (file.size > 5 * 1024 * 1024) { toast.error("Ảnh tối đa 5MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    upload(file);
  };

  const upload = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("avatar", file);
    const res = await fetch("/api/users/me/avatar", { method: "PUT", body: fd });
    const data = await res.json();
    setUploading(false);
    if (res.ok) {
      toast.success("Đã cập nhật ảnh đại diện!");
      onUploaded(data.avatar);
      setPreview(null);
      // Cập nhật session để sidebar hiển thị avatar mới
      await update({ avatar: data.avatar });
    } else { toast.error(data.error || "Upload thất bại"); setPreview(null); }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDelete = async () => {
    setUploading(true);
    const res = await fetch("/api/users/me/avatar", { method: "DELETE" });
    setUploading(false);
    if (res.ok) {
      toast.success("Đã xóa ảnh đại diện");
      onUploaded(null);
      setPreview(null);
      // Cập nhật session để sidebar hiển thị lại initials
      await update({ avatar: null });
    } else toast.error("Xóa thất bại");
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Circle avatar */}
      <div
        className="relative cursor-pointer"
        style={{ width: 112, height: 112 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => !uploading && fileRef.current?.click()}
      >
        {/* Glow ring */}
        <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 opacity-60 blur-sm" />
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-purple-700" />

        {/* Content */}
        <div className="absolute inset-[3px] rounded-full overflow-hidden bg-zinc-900">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="Avatar" width={106} height={106}
              className="h-full w-full object-cover" unoptimized />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center">
              <span className="text-3xl font-bold text-white select-none">{initials}</span>
            </div>
          )}
        </div>

        {/* Hover overlay */}
        <AnimatePresence>
          {(hovered || uploading) && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-[3px] rounded-full bg-black/65 flex flex-col items-center justify-center gap-1"
            >
              {uploading
                ? <Loader2 className="h-6 w-6 text-white animate-spin" />
                : <><Camera className="h-6 w-6 text-white" /><span className="text-[10px] text-white/80 font-medium">Đổi ảnh</span></>
              }
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline"
          className="h-7 border-zinc-700 text-zinc-300 hover:text-white text-xs px-3 gap-1.5"
          disabled={uploading} onClick={() => fileRef.current?.click()}>
          <Upload className="h-3 w-3" />
          {avatarUrl ? "Đổi ảnh" : "Tải lên"}
        </Button>
        {(currentAvatar || preview) && (
          <Button type="button" size="sm" variant="ghost"
            className="h-7 text-red-400 hover:text-red-300 hover:bg-red-400/10 text-xs px-2"
            disabled={uploading} onClick={handleDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
      <p className="text-[11px] text-zinc-600">JPG · PNG · WEBP · GIF · tối đa 5MB</p>

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden" onChange={handleFileChange} />
    </div>
  );
}

// ─── Section title helper ─────────────────────────────────────
function SectionTitle({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="p-1.5 rounded-lg bg-violet-500/15">
        <Icon className="h-4 w-4 text-violet-400" />
      </div>
      <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">{label}</h2>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function ProfilePage() {
  const [profile, setProfile] = useState<Record<string, string | number | boolean | null>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    fetch("/api/users/me").then((r) => r.json()).then((d) => {
      if (d.yearOfStudy && (d.yearOfStudy < 1 || d.yearOfStudy > 6)) d.yearOfStudy = null;
      setProfile(d);
      setLoading(false);
    });
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
    if (res.ok) toast.success("Đã lưu thông tin!");
    else toast.error("Lỗi cập nhật");
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

  if (loading) return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-80 w-full rounded-2xl" />
      <Skeleton className="h-56 w-full rounded-2xl" />
    </div>
  );

  const yearLabel = profile.yearOfStudy ? YEAR_LABELS[profile.yearOfStudy as number] : null;
  const fieldLabel = profile.itField ? FIELD_LABELS[profile.itField as string] : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* ── Page header ───────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold">Hồ sơ cá nhân</h1>
        <p className="mt-1 text-zinc-400">Quản lý thông tin và bảo mật tài khoản</p>
      </motion.div>

      {/* ── Profile card ─────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="glass border-0 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Avatar */}
              <AvatarUploader
                currentAvatar={profile.avatar as string | null}
                name={profile.name as string}
                onUploaded={(a) => setProfile((p) => ({ ...p, avatar: a }))}
              />

              {/* Identity */}
              <div className="flex-1 text-center sm:text-left space-y-2">
                <h2 className="text-2xl font-bold">
                  {(profile.name as string) || "Chưa đặt tên"}
                </h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="text-sm text-zinc-400">{profile.email as string}</span>
                  {profile.emailVerified
                    ? <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" />Đã xác thực
                      </span>
                    : <span className="text-xs text-yellow-400 font-medium">Chưa xác thực</span>}
                </div>

                {/* Info tags */}
                <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
                  {yearLabel && (
                    <span className="flex items-center gap-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 px-3 py-1 text-xs font-medium text-violet-300">
                      <GraduationCap className="h-3.5 w-3.5" />{yearLabel}
                    </span>
                  )}
                  {fieldLabel && (
                    <span className="flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-medium text-blue-300">
                      <Code2 className="h-3.5 w-3.5" />{fieldLabel}
                    </span>
                  )}
                  {profile.school && (
                    <span className="flex items-center gap-1.5 rounded-full bg-zinc-700/50 border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-300">
                      <Building2 className="h-3.5 w-3.5" />{profile.school as string}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Chỉnh sửa thông tin ───────────────────── */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="glass border-0">
          <CardContent className="p-6">
            <SectionTitle icon={ShieldCheck} label="Thông tin cá nhân" />

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-zinc-300">Họ và tên</Label>
                <Input
                  value={(profile.name as string) || ""}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  className="bg-zinc-800/50 border-zinc-700"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-300">Trường</Label>
                <Input
                  value={(profile.school as string) || ""}
                  onChange={(e) => setProfile({ ...profile, school: e.target.value })}
                  placeholder="Đại học Bách Khoa..."
                  className="bg-zinc-800/50 border-zinc-700"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-300">Ngành học</Label>
                <Input
                  value={(profile.major as string) || ""}
                  onChange={(e) => setProfile({ ...profile, major: e.target.value })}
                  placeholder="Khoa học Máy tính..."
                  className="bg-zinc-800/50 border-zinc-700"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-300">Năm học</Label>
                <Select
                  value={profile.yearOfStudy ? String(profile.yearOfStudy) : ""}
                  onValueChange={(v) => setProfile({ ...profile, yearOfStudy: parseInt(v) })}
                >
                  <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                    <SelectValue placeholder="Chọn năm học..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Sinh viên năm 1</SelectItem>
                    <SelectItem value="2">Sinh viên năm 2</SelectItem>
                    <SelectItem value="3">Sinh viên năm 3</SelectItem>
                    <SelectItem value="4">Sinh viên năm 4</SelectItem>
                    <SelectItem value="5">Sinh viên năm 5</SelectItem>
                    <SelectItem value="6">Đã tốt nghiệp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label className="text-zinc-300">Lĩnh vực IT quan tâm</Label>
                <Select
                  value={(profile.itField as string) || ""}
                  onValueChange={(v) => setProfile({ ...profile, itField: v })}
                >
                  <SelectTrigger className="bg-zinc-800/50 border-zinc-700 max-w-xs">
                    <SelectValue placeholder="Chọn lĩnh vực..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FRONTEND">🎨 Frontend</SelectItem>
                    <SelectItem value="BACKEND">⚙️ Backend</SelectItem>
                    <SelectItem value="FULLSTACK">🚀 Fullstack</SelectItem>
                    <SelectItem value="DATA">📊 Data</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleSave} disabled={saving}
                className="bg-violet-600 hover:bg-violet-700 gap-2 min-w-[140px]"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Đổi mật khẩu ─────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="glass border-0">
          <CardContent className="p-6">
            <SectionTitle icon={Lock} label="Bảo mật" />

            <form onSubmit={handlePwChange} className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-zinc-300">Mật khẩu hiện tại</Label>
                <Input
                  type="password"
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                  className="bg-zinc-800/50 border-zinc-700"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Mật khẩu mới</Label>
                <Input
                  type="password"
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                  placeholder="Tối thiểu 8 ký tự..."
                  className="bg-zinc-800/50 border-zinc-700"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Xác nhận mật khẩu</Label>
                <Input
                  type="password"
                  value={pwForm.confirm}
                  onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                  className="bg-zinc-800/50 border-zinc-700"
                  required
                />
              </div>

              <div className="sm:col-span-3 flex justify-end">
                <Button
                  type="submit" disabled={pwSaving}
                  variant="outline"
                  className="border-zinc-700 hover:bg-zinc-800 gap-2 min-w-[160px]"
                >
                  {pwSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  {pwSaving ? "Đang đổi..." : "Đổi mật khẩu"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

    </div>
  );
}
