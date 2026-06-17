import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const FPT_TTS_URL = "https://api.fpt.ai/hmi/tts/v5";

export async function POST(req: Request) {
  // Chỉ cho user đã đăng nhập dùng (tránh lạm dụng quota)
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.FPT_TTS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FPT TTS chưa được cấu hình" }, { status: 503 });
  }

  const { text, voice } = await req.json();
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "text rỗng" }, { status: 400 });
  }

  const trimmed = text.trim().slice(0, 2000);
  // Ưu tiên: voice từ client → FPT_TTS_VOICE từ env → "banmai"
  const selectedVoice = (typeof voice === "string" && voice) ? voice
    : (process.env.FPT_TTS_VOICE ?? "banmai");

  try {
    const fptRes = await fetch(FPT_TTS_URL, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "voice": selectedVoice,
        "speed": "",
        "Content-Type": "application/json",
      },
      body: trimmed,
    });

    if (!fptRes.ok) {
      const errText = await fptRes.text();
      console.error("[FPT TTS] API error:", fptRes.status, errText);
      return NextResponse.json({ error: "FPT TTS thất bại" }, { status: 502 });
    }

    const data = await fptRes.json();

    // FPT trả về { error: 0, message: "OK", async: "https://...mp3" }
    if (data.error !== 0 || !data.async) {
      console.error("[FPT TTS] Unexpected response:", data);
      return NextResponse.json({ error: "FPT TTS trả về lỗi" }, { status: 502 });
    }

    return NextResponse.json({ url: data.async });
  } catch (err) {
    console.error("[FPT TTS] Fetch error:", err);
    return NextResponse.json({ error: "Không kết nối được FPT TTS" }, { status: 502 });
  }
}
