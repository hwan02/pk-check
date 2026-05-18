import { NextRequest, NextResponse } from "next/server";
import { createSsrClient } from "@/lib/supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";

const BUCKET = "listing-images"; // market 이미지도 같은 버킷 재사용

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
  const category = (form.get("category") as string | null) ?? "";
  const name = (form.get("name") as string | null)?.trim();
  const nameEn = (form.get("name_en") as string | null)?.trim() || null;
  const setName = (form.get("set_name") as string | null)?.trim() || null;
  const rarity = (form.get("rarity") as string | null)?.trim() || null;
  const notes = (form.get("notes") as string | null)?.trim() || null;
  const priceRaw = (form.get("price_krw") as string | null) ?? "";
  const orderRaw = (form.get("display_order") as string | null) ?? "0";
  const image = form.get("image") as File | null;

  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  if (!["pokemon", "onepiece"].includes(category))
    return NextResponse.json({ error: "invalid category" }, { status: 400 });

  const priceKrw = parseInt(priceRaw, 10);
  const displayOrder = parseInt(orderRaw, 10) || 0;
  if (!Number.isInteger(priceKrw) || priceKrw < 0)
    return NextResponse.json({ error: "invalid price" }, { status: 400 });

  const admin = createServerClient();

  let imageUrl: string | null = null;
  if (image && image.size > 0) {
    if (image.size > 5 * 1024 * 1024)
      return NextResponse.json({ error: "image too large (5MB max)" }, { status: 400 });
    if (!["image/png", "image/jpeg", "image/webp"].includes(image.type))
      return NextResponse.json({ error: "image type must be png/jpeg/webp" }, { status: 400 });
    const ext = image.name.split(".").pop()?.toLowerCase() || "png";
    const path = `market/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buf = Buffer.from(await image.arrayBuffer());
    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buf, {
      contentType: image.type || "image/png",
      upsert: false,
    });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    imageUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  const { data, error } = await admin
    .from("market_cards")
    .insert({
      category,
      name,
      name_en: nameEn,
      set_name: setName,
      rarity,
      notes,
      price_krw: priceKrw,
      display_order: displayOrder,
      image_url: imageUrl,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, card: data });
}
