import { NextRequest, NextResponse } from "next/server";
import { createSsrClient } from "@/lib/supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest) {
  const ssr = await createSsrClient();
  const { data: { user } } = await ssr.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = createServerClient();
  const { cartItemId, quantity } = await request.json();
  if (!cartItemId || !Number.isInteger(quantity) || quantity < 1) {
    return NextResponse.json({ error: "cartItemId, quantity(1+) 필요" }, { status: 400 });
  }

  // 본인 아이템인지 + 재고 확인
  const { data: item } = await db
    .from("cart_items")
    .select("id, listing_id")
    .eq("id", cartItemId)
    .eq("user_id", user.id)
    .single();
  if (!item) return NextResponse.json({ error: "아이템 없음" }, { status: 404 });

  const { data: listing } = await db
    .from("listings")
    .select("stock")
    .eq("id", item.listing_id)
    .single();
  if (listing && quantity > listing.stock) {
    return NextResponse.json({ error: `재고 부족 (${listing.stock}개)` }, { status: 400 });
  }

  await db.from("cart_items").update({ quantity }).eq("id", cartItemId);
  return NextResponse.json({ ok: true });
}
