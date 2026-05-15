import { NextResponse } from "next/server";
import { createSsrClient } from "@/lib/supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";
import { getUsdToKrw, quoteShipping, calcShippingKRW, getShippingZone, isKorea, ZONE_LABEL, DOMESTIC_LABEL } from "@/lib/shipping";
import { calcFees, PAYMENT_FEE_RATE } from "@/lib/fees";

// 결제 직전 견적: 장바구니 + 선택된 배송지로 배송비/예상중량 계산
export async function GET(request: Request) {
  const url = new URL(request.url);
  const weightOverride = url.searchParams.get("weight");
  const addressIdOverride = url.searchParams.get("address_id");

  const ssr = await createSsrClient();
  const { data: { user } } = await ssr.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  }

  const db = createServerClient();

  // 1) 배송지 선택: ?address_id 우선, 없으면 default
  let addressQuery = db
    .from("shipping_addresses")
    .select("id, label, recipient_name, phone, country, postal_code, address1, address2, is_default")
    .eq("user_id", user.id);
  if (addressIdOverride) {
    addressQuery = addressQuery.eq("id", addressIdOverride);
  } else {
    addressQuery = addressQuery.eq("is_default", true);
  }

  const [cartRes, addressRes, addressListRes, rate] = await Promise.all([
    db
      .from("cart_items")
      .select("*, listing:listings(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    addressQuery.maybeSingle(),
    db
      .from("shipping_addresses")
      .select("id, label, recipient_name, country, postal_code, address1, address2, is_default")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false }),
    getUsdToKrw(),
  ]);

  type CartRow = {
    id: string;
    quantity: number;
    listing: { id: string; price_usd: number } | null;
  };
  const items = (cartRes.data ?? []) as CartRow[];
  const address = addressRes.data as {
    id: string;
    label: string | null;
    recipient_name: string;
    phone: string | null;
    country: string;
    postal_code: string;
    address1: string;
    address2: string | null;
    is_default: boolean;
  } | null;

  const profile = address
    ? {
        recipient_name: address.recipient_name,
        phone: address.phone,
        postal_code: address.postal_code,
        address1: address.address1,
        address2: address.address2,
        country: address.country,
      }
    : null;

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal_usd = Math.round(
    items.reduce(
      (s, i) => s + (i.listing?.price_usd ?? 0) * i.quantity,
      0,
    ) * 100,
  ) / 100;

  let quote;
  if (weightOverride && !isNaN(Number(weightOverride))) {
    const weightG = Number(weightOverride);
    const country = address?.country ?? null;
    if (isKorea(country)) {
      quote = { zone: 1 as const, country: "KR", weight_g: weightG, shipping_krw: 4000, shipping_usd: Math.round((4000 / rate) * 100) / 100, exchange_rate: rate, domestic: true };
    } else {
      const zone = getShippingZone(country);
      const shipping_krw = calcShippingKRW(zone, weightG);
      const shipping_usd = Math.round((shipping_krw / rate) * 100) / 100;
      quote = { zone, country: (country ?? "").toUpperCase() || "??", weight_g: weightG, shipping_krw, shipping_usd, exchange_rate: rate, domestic: false };
    }
  } else {
    quote = quoteShipping(address?.country, totalQty, rate);
  }
  const fees = calcFees(subtotal_usd, quote.shipping_usd);

  const individualShippingTotal = items.reduce((sum, item) => {
    const q = quoteShipping(address?.country, item.quantity, rate);
    return sum + q.shipping_usd;
  }, 0);
  const bundleSavingUsd = Math.round((individualShippingTotal - quote.shipping_usd) * 100) / 100;

  return NextResponse.json({
    items: cartRes.data ?? [],
    profile,
    address_id: address?.id ?? null,
    addresses: addressListRes.data ?? [],
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
