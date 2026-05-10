import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, price, url, image } = body as {
    title: string;
    price: number;
    url: string;
    image: string;
  };

  if (!title || !price) {
    return NextResponse.json({ error: "title and price required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // 고유 ID 생성: snkrdunk URL에서 ID 추출 또는 타이틀 기반
  const snkrId = url.match(/\/apparels\/(\d+)/)?.[1] ?? "";
  const cardId = `snkr-${snkrId || Date.now()}`;

  // 타이틀에서 카드 이름 추출 (괄호 앞부분)
  const name = title.split("(")[0].trim();

  // custom 세트가 없으면 생성
  const { error: setErr } = await supabase
    .from("sets")
    .upsert({ id: "custom", name: "수동 추가", name_ja: "手動追加", series: "Custom" }, { onConflict: "id" });
  if (setErr) console.error("set upsert error:", setErr.message);

  // 카드 upsert
  const { error: cardErr } = await supabase.from("cards").upsert({
    id: cardId,
    name,
    name_ja: name,
    supertype: "Pokémon",
    types: null,
    subtypes: null,
    hp: null,
    rarity: null,
    rarity_ja: null,
    set_id: "custom",
    number: snkrId || null,
    artist: null,
    attacks: null,
    weaknesses: null,
    resistances: null,
    retreat_cost: null,
    image_small: image || null,
    image_large: image || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });

  if (cardErr) {
    return NextResponse.json({ error: cardErr.message }, { status: 500 });
  }

  // 가격 upsert
  const { error: priceErr } = await supabase.from("prices").upsert({
    card_id: cardId,
    tcg_market: null,
    tcg_low: null,
    tcg_mid: null,
    tcg_high: null,
    snkrdunk_price: price,
    snkrdunk_title: title,
    snkrdunk_url: url || null,
    fetched_at: new Date().toISOString(),
  }, { onConflict: "card_id" });

  if (priceErr) {
    return NextResponse.json({ error: priceErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, cardId });
}
