import { NextRequest, NextResponse } from "next/server";
import { createSsrClient } from "@/lib/supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";

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

// 카드 메타 inline 편집
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    const status = auth.error === "unauthorized" ? 401 : 403;
    return NextResponse.json({ error: auth.error }, { status });
  }
  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
  if (typeof body.display_order === "number") updates.display_order = body.display_order;
  if (typeof body.notes === "string") updates.notes = body.notes.trim() || null;
  if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();
  if (typeof body.name_en === "string") updates.name_en = body.name_en.trim() || null;
  if (typeof body.set_name === "string") updates.set_name = body.set_name.trim() || null;
  if (typeof body.rarity === "string") updates.rarity = body.rarity.trim() || null;
  if (typeof body.category === "string" && ["pokemon", "onepiece"].includes(body.category))
    updates.category = body.category;
  if (typeof body.product_type === "string" && ["box", "pack", "single"].includes(body.product_type))
    updates.product_type = body.product_type;
  // parent_id: null 보내면 해제
  if (body.parent_id === null) updates.parent_id = null;
  else if (typeof body.parent_id === "string" && body.parent_id.trim())
    updates.parent_id = body.parent_id.trim();
  // 정가 — null 또는 정수
  if (body.list_price_krw === null) updates.list_price_krw = null;
  else if (typeof body.list_price_krw === "number" && body.list_price_krw >= 0)
    updates.list_price_krw = Math.round(body.list_price_krw);

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "no updates" }, { status: 400 });

  const admin = createServerClient();

  // product_type / parent_id / category 가 바뀌면 위계 유효성 재검사
  if ("product_type" in updates || "parent_id" in updates || "category" in updates) {
    const { data: current } = await admin
      .from("market_cards")
      .select("product_type, parent_id, category")
      .eq("id", id)
      .maybeSingle();
    if (!current) return NextResponse.json({ error: "not found" }, { status: 404 });

    const nextType = (updates.product_type ?? current.product_type) as "box" | "pack" | "single";
    const nextParentId =
      "parent_id" in updates ? (updates.parent_id as string | null) : current.parent_id;
    const nextCategory = (updates.category ?? current.category) as "pokemon" | "onepiece";

    if (nextType === "box" && nextParentId) {
      return NextResponse.json({ error: "box cannot have a parent" }, { status: 400 });
    }
    if (nextParentId) {
      const need = nextType === "single" ? "pack" : nextType === "pack" ? "box" : null;
      const { data: parentRow } = await admin
        .from("market_cards")
        .select("id, product_type, category")
        .eq("id", nextParentId)
        .maybeSingle();
      if (!parentRow) return NextResponse.json({ error: "parent not found" }, { status: 400 });
      if (parentRow.product_type !== need)
        return NextResponse.json({ error: `parent must be a ${need}` }, { status: 400 });
      if (parentRow.category !== nextCategory)
        return NextResponse.json({ error: "parent category mismatch" }, { status: 400 });
      if (parentRow.id === id)
        return NextResponse.json({ error: "self parent" }, { status: 400 });
    }
  }

  const { data, error } = await admin
    .from("market_cards")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, card: data });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    const status = auth.error === "unauthorized" ? 401 : 403;
    return NextResponse.json({ error: auth.error }, { status });
  }
  const { id } = await params;
  const admin = createServerClient();
  const { error } = await admin.from("market_cards").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
