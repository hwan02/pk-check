import { NextRequest, NextResponse } from "next/server";
import { createSsrClient } from "@/lib/supabase/ssr";

export async function GET() {
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("cart_items")
    .select("*, listing:listings(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json();
  const listingId = body.listing_id as string | undefined;
  const quantity = parseInt(body.quantity ?? "1", 10);
  if (!listingId) return NextResponse.json({ error: "listing_id required" }, { status: 400 });
  if (!Number.isInteger(quantity) || quantity < 1)
    return NextResponse.json({ error: "invalid quantity" }, { status: 400 });

  const { data: listing } = await supabase
    .from("listings")
    .select("id, stock, is_active")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing || !listing.is_active)
    return NextResponse.json({ error: "listing not found" }, { status: 404 });

  // upsert: 기존에 있으면 quantity 증가
  const { data: existing } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("user_id", user.id)
    .eq("listing_id", listingId)
    .maybeSingle();

  const newQty = (existing?.quantity ?? 0) + quantity;
  if (newQty > listing.stock)
    return NextResponse.json({ error: "재고 부족" }, { status: 400 });

  if (existing) {
    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: newQty })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase
      .from("cart_items")
      .insert({ user_id: user.id, listing_id: listingId, quantity });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}