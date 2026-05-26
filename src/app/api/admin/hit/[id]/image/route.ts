import { NextRequest, NextResponse } from "next/server";
import { createSsrClient } from "@/lib/supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";

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

interface Ctx { params: Promise<{ id: string }> }

// 이미지 업로드/교체
export async function POST(request: NextRequest, { params }: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    const status = auth.error === "unauthorized" ? 401 : 403;
    return NextResponse.json({ error: auth.error }, { status });
  }
  const { id } = await params;

  const form = await request.formData();
  const image = form.get("image") as File | null;
  if (!image || image.size === 0)
    return NextResponse.json({ error: "image required" }, { status: 400 });
  if (image.size > 5 * 1024 * 1024)
    return NextResponse.json({ error: "image too large (5MB max)" }, { status: 400 });
  if (!["image/png", "image/jpeg", "image/webp"].includes(image.type))
    return NextResponse.json({ error: "image type must be png/jpeg/webp" }, { status: 400 });

  const admin = createServerClient();

  // 기존 image_url 확인 — Storage 파일이면 삭제 (외부 URL 은 무시)
  const { data: cur } = await admin
    .from("market_cards")
    .select("image_url")
    .eq("id", id)
    .maybeSingle();
  if (!cur) return NextResponse.json({ error: "card not found" }, { status: 404 });

  const oldUrl = cur.image_url ?? "";
  const oldPath = oldUrl.includes(`/${BUCKET}/`) ? oldUrl.split(`/${BUCKET}/`)[1] : null;

  // 새 이미지 업로드
  const ext = image.name.split(".").pop()?.toLowerCase() || "png";
  const path = `market/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buf = Buffer.from(await image.arrayBuffer());
  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buf, {
    contentType: image.type,
    upsert: false,
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  const newUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  // DB update
  const { error: updErr } = await admin
    .from("market_cards")
    .update({ image_url: newUrl })
    .eq("id", id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // 기존 Storage 파일 정리 (외부 URL이면 skip)
  if (oldPath) {
    await admin.storage.from(BUCKET).remove([oldPath]).catch(() => {});
  }

  return NextResponse.json({ ok: true, image_url: newUrl });
}

// 이미지 제거
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    const status = auth.error === "unauthorized" ? 401 : 403;
    return NextResponse.json({ error: auth.error }, { status });
  }
  const { id } = await params;
  const admin = createServerClient();
  const { data: cur } = await admin
    .from("market_cards")
    .select("image_url")
    .eq("id", id)
    .maybeSingle();
  if (!cur) return NextResponse.json({ error: "card not found" }, { status: 404 });

  const oldUrl = cur.image_url ?? "";
  const oldPath = oldUrl.includes(`/${BUCKET}/`) ? oldUrl.split(`/${BUCKET}/`)[1] : null;

  const { error } = await admin
    .from("market_cards")
    .update({ image_url: null })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (oldPath) {
    await admin.storage.from(BUCKET).remove([oldPath]).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
