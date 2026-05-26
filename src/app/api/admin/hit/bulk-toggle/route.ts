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

/**
 * 박스 단위 일괄 토글.
 * body: { box_id: string, is_active: boolean }
 *
 * 박스 + 자식 팩 + 자식 팩의 자식 싱글 + 박스 직속 자식(이상 케이스 대비) 모두 한방에 토글.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    const status = auth.error === "unauthorized" ? 401 : 403;
    return NextResponse.json({ error: auth.error }, { status });
  }

  const body = await request.json().catch(() => null);
  const boxId = typeof body?.box_id === "string" ? body.box_id : "";
  const nextActive = typeof body?.is_active === "boolean" ? body.is_active : null;
  if (!boxId || nextActive === null) {
    return NextResponse.json({ error: "box_id, is_active required" }, { status: 400 });
  }

  const admin = createServerClient();

  // 박스 존재 + 박스인지 확인
  const { data: box, error: boxErr } = await admin
    .from("market_cards")
    .select("id, product_type")
    .eq("id", boxId)
    .maybeSingle();
  if (boxErr) return NextResponse.json({ error: boxErr.message }, { status: 500 });
  if (!box) return NextResponse.json({ error: "box not found" }, { status: 404 });
  if (box.product_type !== "box") {
    return NextResponse.json({ error: "target is not a box" }, { status: 400 });
  }

  // 1) 박스 직속 자식 (팩 또는 박스에 바로 붙은 싱글 둘 다)
  const { data: directChildren } = await admin
    .from("market_cards")
    .select("id, product_type")
    .eq("parent_id", boxId);
  const directIds = (directChildren ?? []).map((c) => c.id);
  const packIds = (directChildren ?? []).filter((c) => c.product_type === "pack").map((c) => c.id);

  // 2) 팩들의 자식 (싱글)
  let grandChildIds: string[] = [];
  if (packIds.length > 0) {
    const { data: gc } = await admin
      .from("market_cards")
      .select("id")
      .in("parent_id", packIds);
    grandChildIds = (gc ?? []).map((r) => r.id);
  }

  // 3) 한방에 update
  const allIds = [boxId, ...directIds, ...grandChildIds];
  const { error: updErr } = await admin
    .from("market_cards")
    .update({ is_active: nextActive })
    .in("id", allIds);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    updated: allIds.length,
    breakdown: {
      box: 1,
      direct_children: directIds.length,
      grand_children: grandChildIds.length,
    },
  });
}
