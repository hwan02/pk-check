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

interface CardRow {
  id: string;
  name: string;
  rarity: string | null;
  rarity_ja: string | null;
  image_small: string | null;
  image_large: string | null;
  number: string | null;
}

// ?w=256 같은 쿼리 제거하고 더 큰 사이즈로 강제
function upscaleImageUrl(url: string): string {
  return url.replace(/\?w=\d+/, "?w=1024");
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    const status = auth.error === "unauthorized" ? 401 : 403;
    return NextResponse.json({ error: auth.error }, { status });
  }

  const body = await request.json();
  const setId = typeof body.set_id === "string" ? body.set_id : "";
  const rarityFilter: string[] | null =
    Array.isArray(body.rarity_filter) && body.rarity_filter.length > 0
      ? body.rarity_filter.map(String)
      : null;
  if (!setId) return NextResponse.json({ error: "set_id required" }, { status: 400 });

  const admin = createServerClient();

  // 1) 세트 메타
  const { data: setRow } = await admin
    .from("sets")
    .select("id, name, name_ja, region")
    .eq("id", setId)
    .maybeSingle();
  if (!setRow) return NextResponse.json({ error: "set not found" }, { status: 404 });

  const isKr = (setRow.region ?? "").toLowerCase() === "kr";
  const setLabel = (setRow.name_ja || setRow.name) ?? setId;

  // 2) 카드 목록 (페이지네이션으로 모두)
  const all: CardRow[] = [];
  let from = 0;
  const STEP = 1000;
  while (true) {
    let q = admin
      .from("cards")
      .select("id, name, rarity, rarity_ja, image_small, image_large, number")
      .eq("set_id", setId)
      .range(from, from + STEP - 1);
    if (rarityFilter) q = q.in("rarity", rarityFilter);
    const { data: page, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const rows = (page ?? []) as CardRow[];
    all.push(...rows);
    if (rows.length < STEP) break;
    from += STEP;
  }
  if (all.length === 0)
    return NextResponse.json({ error: "no cards matched" }, { status: 404 });

  // 3) 중복 방지 — 이미 같은 set+number 조합 있는 market_cards 제외 (notes 에 catalog id 저장해서 식별)
  const catalogTokens = all.map((c) => `cat:${c.id}`);
  const { data: existing } = await admin
    .from("market_cards")
    .select("notes")
    .in("notes", catalogTokens);
  const existingSet = new Set(((existing ?? []) as { notes: string | null }[]).map((r) => r.notes));

  // 4) insert payload
  const inserts = all
    .filter((c) => !existingSet.has(`cat:${c.id}`))
    .map((c, i) => {
      const img = upscaleImageUrl(c.image_large || c.image_small || "");
      return {
        category: "pokemon" as const,
        product_type: "single" as const, // 위계: 싱글 카드
        parent_id: null, // 박스/팩 행이 있으면 어드민에서 연결
        name: c.name,
        name_en: null,
        set_name: setLabel,
        rarity: c.rarity_ja || c.rarity || null,
        image_url: img || null,
        notes: `cat:${c.id}`, // 카탈로그 연결 식별자
        is_active: false,
        display_order: i,
      };
    });

  if (inserts.length === 0) {
    return NextResponse.json({
      ok: true,
      imported: 0,
      skipped: all.length,
      message: "이미 모두 import 되어 있음",
    });
  }

  // 5) bulk insert (한 번에 1000개씩)
  let imported = 0;
  for (let i = 0; i < inserts.length; i += 500) {
    const chunk = inserts.slice(i, i + 500);
    const { error: insErr } = await admin.from("market_cards").insert(chunk);
    if (insErr)
      return NextResponse.json({ error: insErr.message, imported }, { status: 500 });
    imported += chunk.length;
  }

  return NextResponse.json({
    ok: true,
    imported,
    skipped: all.length - imported,
    set: setLabel,
    isKr,
  });
}
