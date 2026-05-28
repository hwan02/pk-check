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
  const productTypeRaw = (form.get("product_type") as string | null) ?? "single";
  const parentIdRaw = (form.get("parent_id") as string | null)?.trim() || null;
  const name = (form.get("name") as string | null)?.trim();
  const nameEn = (form.get("name_en") as string | null)?.trim() || null;
  const setName = (form.get("set_name") as string | null)?.trim() || null;
  const rarity = (form.get("rarity") as string | null)?.trim() || null;
  const notes = (form.get("notes") as string | null)?.trim() || null;
  const orderRaw = (form.get("display_order") as string | null) ?? "0";
  const listPriceRaw = (form.get("list_price_krw") as string | null)?.trim() || "";
  const image = form.get("image") as File | null;

  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  if (!["pokemon", "onepiece"].includes(category))
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  if (!["box", "pack", "single"].includes(productTypeRaw))
    return NextResponse.json({ error: "invalid product_type" }, { status: 400 });
  const productType = productTypeRaw as "box" | "pack" | "single";

  // 부모 타입 검증 — single 은 box 또는 pack 어디든 가능, pack 은 box 만. box 는 부모 없음.
  const admin = createServerClient();
  let parentId: string | null = null;
  let inheritedSetName: string | null = null;
  if (parentIdRaw) {
    if (productType === "box") {
      return NextResponse.json({ error: "box cannot have a parent" }, { status: 400 });
    }
    const allowed: string[] = productType === "single" ? ["box", "pack"] : ["box"];
    const { data: parentRow } = await admin
      .from("market_cards")
      .select("id, product_type, category, set_name, name")
      .eq("id", parentIdRaw)
      .maybeSingle();
    if (!parentRow) {
      return NextResponse.json({ error: "parent not found" }, { status: 400 });
    }
    if (!allowed.includes(parentRow.product_type)) {
      return NextResponse.json(
        { error: `parent must be one of: ${allowed.join(", ")}` },
        { status: 400 },
      );
    }
    if (parentRow.category !== category) {
      return NextResponse.json({ error: "parent category mismatch" }, { status: 400 });
    }
    parentId = parentIdRaw;
    inheritedSetName = parentRow.set_name ?? parentRow.name ?? null;
  }
  // set_name: 자체 입력 우선, 없으면 부모 박스 set_name 자동 사용
  const effectiveSetName = setName ?? inheritedSetName;

  const displayOrder = parseInt(orderRaw, 10) || 0;
  let listPriceKrw: number | null = null;
  if (listPriceRaw) {
    const n = parseInt(listPriceRaw, 10);
    if (!Number.isFinite(n) || n < 0)
      return NextResponse.json({ error: "invalid list_price_krw" }, { status: 400 });
    listPriceKrw = n;
  }

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
      product_type: productType,
      parent_id: parentId,
      name,
      name_en: nameEn,
      set_name: effectiveSetName,
      rarity,
      notes,
      list_price_krw: listPriceKrw,
      display_order: displayOrder,
      image_url: imageUrl,
      is_active: true,
      short_id: Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0"),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, card: data });
}
