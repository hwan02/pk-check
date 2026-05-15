import { NextResponse } from "next/server";
import { createSsrClient } from "@/lib/supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";
import { getUsdToKrw, quoteShipping, ZONE_LABEL, DOMESTIC_LABEL } from "@/lib/shipping";
import { calcFees, PAYMENT_FEE_RATE } from "@/lib/fees";

// 결제 직전 견적: 장바구니 + 회원 배송지로 배송비/예상중량 계산
export async function GET() {
  const ssr = await createSsrClient();
  const { data: { user } } = await ssr.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  }

  const db = createServerClient();
  const [cartRes, profileRes, rate] = await Promise.all([
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
    getUsdToKrw(),
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

  const quote = quoteShipping(profile?.country, totalQty, rate);
  const fees = calcFees(subtotal_usd, quote.shipping_usd);

  // 묶음 배송 절약: 개별 발송 시 배송비 합산 vs 묶음 발송
  const individualShippingTotal = items.reduce((sum, item) => {
    const q = quoteShipping(profile?.country, item.quantity, rate);
    return sum + q.shipping_usd;
  }, 0);
  const bundleSavingUsd = Math.round((individualShippingTotal - quote.shipping_usd) * 100) / 100;

  return NextResponse.json({
    items: cartRes.data ?? [],
    profile,
    subtotal_usd: fees.subtotal_usd,
    payment_fee_usd: fees.payment_fee_usd,
    fee_rates: {
      payment: PAYMENT_FEE_RATE,
    },
    shipping: {
      ...quote,
      zone_label: quote.domestic ? DOMESTIC_LABEL : ZONE_LABEL[quote.zone],
    },
    bundle_saving_usd: bundleSavingUsd,
    total_usd: fees.total_usd,
  });
}
