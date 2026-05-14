import { NextRequest, NextResponse } from "next/server";
import { createSsrClient } from "@/lib/supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  // 인증 확인은 SSR 클라이언트로
  const ssrClient = await createSsrClient();
  const { data: { user } } = await ssrClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { cardId } = await request.json();
  if (!cardId) return NextResponse.json({ error: "cardId required" }, { status: 400 });

  // DB 작업은 service role로 (RLS 우회)
  const supabase = createServerClient();

  // 이미 이 card_id로 listing이 있는지 확인
  const { data: existing } = await supabase
    .from("listings")
    .select("id")
    .eq("card_id", cardId)
    .eq("is_active", true)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ listingId: existing.id });
  }

  // cards_with_prices에서 카드 정보 가져오기
  const { data: card } = await supabase
    .from("cards_with_prices")
    .select("id, name, name_ja, rarity, rarity_ja, image_small, image_large, tcg_market, snkrdunk_price, set_name")
    .eq("id", cardId)
    .maybeSingle();

  if (!card) return NextResponse.json({ error: "card not found" }, { status: 404 });

  // 가격 계산
  let priceUsd = 0;
  if (card.tcg_market) priceUsd = Number(card.tcg_market);
  else if (card.snkrdunk_price) priceUsd = Math.round(Number(card.snkrdunk_price) / 150 * 100) / 100;
  if (priceUsd <= 0) priceUsd = 1;

  const title = card.name_ja || card.name;

  const { data: listing, error } = await supabase
    .from("listings")
    .insert({
      title,
      title_en: card.name,
      category: "pokemon",
      language: "en",
      condition: "near-mint",
      price_usd: priceUsd,
      stock: 99,
      description: [card.set_name, card.rarity_ja || card.rarity].filter(Boolean).join(" · ") || null,
      description_en: [card.set_name, card.rarity].filter(Boolean).join(" · ") || null,
      image_url: card.image_large || card.image_small,
      is_active: true,
      card_id: cardId,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ listingId: listing.id });
}
