import { NextRequest, NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { createSsrClient } from "@/lib/supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";

const BUCKET = "listing-images";

// URL-safe, 헷갈리는 문자(0/O, 1/l/I) 제외한 알파벳으로 8자
const shortId = customAlphabet(
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz",
  8,
);

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
  const title = (form.get("title") as string | null)?.trim();
  const titleEn = (form.get("title_en") as string | null)?.trim() || null;
  const category = (form.get("category") as string | null) ?? "";
  const language = (form.get("language") as string | null) || null;
  const condition = (form.get("condition") as string | null) || null;
  const priceUsdRaw = (form.get("price_usd") as string | null) ?? "";
  const stockRaw = (form.get("stock") as string | null) ?? "1";
  const description = (form.get("description") as string | null)?.trim() || null;
  const descriptionEn = (form.get("description_en") as string | null)?.trim() || null;
  const gradingCompany = (form.get("grading_company") as string | null)?.trim() || null;
  const gradingGrade = (form.get("grading_grade") as string | null)?.trim() || null;
  const videoUrlRaw = (form.get("video_url") as string | null)?.trim() || null;
  const videoUrl =
    videoUrlRaw && /^https?:\/\//.test(videoUrlRaw) ? videoUrlRaw : null;
  const image = form.get("image") as File | null;

  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
  if (!["pokemon", "onepiece"].includes(category))
    return NextResponse.json({ error: "invalid category" }, { status: 400 });

  const priceUsd = parseFloat(priceUsdRaw);
  const stock = parseInt(stockRaw, 10);
  if (!Number.isFinite(priceUsd) || priceUsd < 0)
    return NextResponse.json({ error: "invalid price" }, { status: 400 });
  if (!Number.isInteger(stock) || stock < 0)
    return NextResponse.json({ error: "invalid stock" }, { status: 400 });

  // service-role 클라이언트로 storage 업로드 + insert
  const admin = createServerClient();

  let imageUrl: string | null = null;
  if (image && image.size > 0) {
    if (image.size > 5 * 1024 * 1024)
      return NextResponse.json({ error: "image too large (5MB max)" }, { status: 400 });
    if (!["image/png", "image/jpeg", "image/webp"].includes(image.type))
      return NextResponse.json({ error: "image type must be png/jpeg/webp" }, { status: 400 });
    const ext = image.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buf = Buffer.from(await image.arrayBuffer());
    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buf, {
      contentType: image.type || "image/png",
      upsert: false,
    });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
    imageUrl = pub.publicUrl;
  }

  // nanoid 짧은 ID 생성 (충돌 시 1회 재시도)
  let short_id = shortId();
  const existing = await admin
    .from("listings")
    .select("id")
    .eq("short_id", short_id)
    .maybeSingle();
  if (existing.data) short_id = shortId();

  const { data, error } = await admin
    .from("listings")
    .insert({
      short_id,
      title,
      title_en: titleEn,
      category,
      language,
      condition,
      price_usd: priceUsd,
      stock,
      description,
      description_en: descriptionEn,
      image_url: imageUrl,
      video_url: videoUrl,
      grading_company: gradingCompany,
      grading_grade: gradingGrade,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, listing: data });
}