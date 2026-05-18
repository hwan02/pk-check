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

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    const status = auth.error === "unauthorized" ? 401 : 403;
    return NextResponse.json({ error: auth.error }, { status });
  }

  const form = await request.formData();
  const title = (form.get("title") as string | null)?.trim();
  const subtitle = (form.get("subtitle") as string | null)?.trim() || null;
  const bodyMd = (form.get("body_md") as string | null) ?? "";
  const isPublishedRaw = form.get("is_published");
  const isPublished = isPublishedRaw === "true" || isPublishedRaw === "1";
  const slugRaw = (form.get("slug") as string | null)?.trim() || "";
  const picksRaw = (form.get("market_card_ids") as string | null) ?? "";
  const cover = form.get("cover") as File | null;

  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
  if (!bodyMd.trim()) return NextResponse.json({ error: "body_md required" }, { status: 400 });

  const slug = slugify(slugRaw || title) || `article-${Date.now()}`;

  const admin = createServerClient();

  let coverUrl: string | null = null;
  if (cover && cover.size > 0) {
    if (cover.size > 5 * 1024 * 1024)
      return NextResponse.json({ error: "cover too large (5MB max)" }, { status: 400 });
    if (!["image/png", "image/jpeg", "image/webp"].includes(cover.type))
      return NextResponse.json({ error: "cover type must be png/jpeg/webp" }, { status: 400 });
    const ext = cover.name.split(".").pop()?.toLowerCase() || "png";
    const path = `articles/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buf = Buffer.from(await cover.arrayBuffer());
    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buf, {
      contentType: cover.type,
      upsert: false,
    });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    coverUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  const { data: article, error } = await admin
    .from("articles")
    .insert({
      slug,
      title,
      subtitle,
      cover_image: coverUrl,
      body_md: bodyMd,
      is_published: isPublished,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 픽 카드 연결
  const ids = picksRaw.split(",").map((s) => s.trim()).filter(Boolean);
  if (ids.length > 0) {
    const rows = ids.map((id, i) => ({
      article_id: article.id,
      market_card_id: id,
      display_order: i,
    }));
    const { error: pickErr } = await admin.from("article_market_picks").insert(rows);
    if (pickErr) {
      // article 자체는 살리고 픽만 실패 경고
      return NextResponse.json({ ok: true, article, pick_warning: pickErr.message });
    }
  }

  return NextResponse.json({ ok: true, article });
}
