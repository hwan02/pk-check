import { NextRequest, NextResponse } from "next/server";
import { createSsrClient } from "@/lib/supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";

/**
 * 응모 이미지 업로드 (id 없이도 가능 — 신규 등록 흐름에서 사용).
 * 업로드 후 public URL 만 돌려줌. DB 반영은 사용자가 폼 저장할 때 image_url 필드로.
 *
 * - listing-images 버킷의 `raffle/` 폴더 사용
 * - 5MB / png|jpeg|webp 제한
 */
const BUCKET = "listing-images";

async function requireAdmin() {
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" as const };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") return { error: "forbidden" as const };
  return { user };
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    const status = auth.error === "unauthorized" ? 401 : 403;
    return NextResponse.json({ error: auth.error }, { status });
  }

  const form = await request.formData();
  const image = form.get("image") as File | null;
  if (!image || image.size === 0)
    return NextResponse.json({ error: "image required" }, { status: 400 });
  if (image.size > 5 * 1024 * 1024)
    return NextResponse.json({ error: "image too large (5MB max)" }, { status: 400 });
  if (!["image/png", "image/jpeg", "image/webp"].includes(image.type))
    return NextResponse.json({ error: "image type must be png/jpeg/webp" }, { status: 400 });

  const admin = createServerClient();
  const ext = image.name.split(".").pop()?.toLowerCase() || "png";
  const path = `raffle/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buf = Buffer.from(await image.arrayBuffer());
  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buf, {
    contentType: image.type,
    upsert: false,
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const url = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  return NextResponse.json({ ok: true, url, path });
}
