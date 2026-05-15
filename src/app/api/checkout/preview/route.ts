import { NextResponse } from "next/server";
import { createSsrClient } from "@/lib/supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";
import { quoteShipping, ZONE_LABEL } from "@/lib/shipping";

// 결제 직전 견적: 장바구니 + 회원 배송지로 배송비/예상중량 계산
export async function GET() {
  const ssr = await createSsrClient();
  const { data: { user } } = await ssr.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  }

  const db = createServerClient();
  const [cartRes, profileRes] = await Promise.all([
    db
      .from("cart_items")
      .select("*, listing:listings(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    db
      .from("profiles")
      .select(
        "recipient_name, phone, postal_code, address1, address2, country",
      )
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  type CartRow = {
    id: string;
    quantity: number;
    listing: { id: string; price_usd: number } | null;
  };
  const items = (cartRes.data ?? []) as CartRow[];
  const profile = profileRes.data as {
    recipient_name: string | null;
    phone: string | null;
    postal_code: string | null;
    address1: string | null;
    address2: string | null;
    country: string | null;
  } | null;

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal_usd = Math.round(
    items.reduce(
      (s, i) => s + (i.listing?.price_usd ?? 0) * i.quantity,
      0,
    ) * 100,
  ) / 100;

  const quote = quoteShipping(profile?.country, totalQty);
  const total_usd = Math.round((subtotal_usd + quote.shipping_usd) * 100) / 100;

  return NextResponse.json({
    items: cartRes.data ?? [],
    profile,
    subtotal_usd,
    shipping: {
      ...quote,
      zone_label: ZONE_LABEL[quote.zone],
    },
    total_usd,
  });
}
