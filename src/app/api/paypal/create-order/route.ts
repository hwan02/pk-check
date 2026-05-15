import { NextRequest, NextResponse } from "next/server";
import { createSsrClient } from "@/lib/supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";
import { createPayPalOrder } from "@/lib/paypal";
import { getUsdToKrw, quoteShipping } from "@/lib/shipping";
import { calcFees } from "@/lib/fees";

export async function POST(request: NextRequest) {
  const ssrClient = await createSsrClient();
  const { data: { user } } = await ssrClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const addressId = typeof body.address_id === "string" ? body.address_id : null;

  const db = createServerClient();

  let addressQuery = db
    .from("shipping_addresses")
    .select("id, recipient_name, phone, country, postal_code, address1, address2")
    .eq("user_id", user.id);
  addressQuery = addressId
    ? addressQuery.eq("id", addressId)
    : addressQuery.eq("is_default", true);

  const [cartRes, addressRes, profileRes, rate] = await Promise.all([
    db
      .from("cart_items")
      .select("*, listing:listings(*)")
      .eq("user_id", user.id),
    addressQuery.maybeSingle(),
    db.from("profiles").select("name").eq("id", user.id).maybeSingle(),
    getUsdToKrw(),
  ]);

  const cartItems = cartRes.data;
  if (!cartItems?.length) {
    return NextResponse.json({ error: "장바구니가 비어있습니다" }, { status: 400 });
  }

  const address = addressRes.data as {
    id: string;
    recipient_name: string;
    phone: string | null;
    country: string;
    postal_code: string;
    address1: string;
    address2: string | null;
  } | null;

  if (!address) {
    return NextResponse.json(
      { error: "배송지가 등록되지 않았습니다. 마이페이지에서 먼저 등록해 주세요." },
      { status: 400 },
    );
  }

  const subtotal = Math.round(
    cartItems.reduce((sum, item) => {
      const price = (item.listing as { price_usd: number })?.price_usd ?? 0;
      return sum + price * item.quantity;
    }, 0) * 100,
  ) / 100;

  const totalQty = cartItems.reduce((s, i) => s + i.quantity, 0);
  const quote = quoteShipping(address.country, totalQty, rate);
  const fees = calcFees(subtotal, quote.shipping_usd);
  const shipping = fees.shipping_usd;
  const total = fees.total_usd;

  const profileName = (profileRes.data as { name: string | null } | null)?.name ?? null;

  // 주문 시점의 배송지 스냅샷
  const shippingAddress = {
    name: address.recipient_name || profileName || "",
    line1: address.address1,
    line2: address.address2 ?? undefined,
    postal_code: address.postal_code,
    country: address.country,
    phone: address.phone ?? undefined,
  };

  const orderItems = cartItems.map((item) => {
    const listing = item.listing as {
      id: string;
      title: string;
      title_en: string | null;
      image_url: string | null;
      price_usd: number;
    };
    return {
      listing_id: listing.id,
      title: listing.title,
      title_en: listing.title_en,
      image_url: listing.image_url,
      price_usd: listing.price_usd,
      quantity: item.quantity,
    };
  });

  const { data: order, error: orderErr } = await db
    .from("orders")
    .insert({
      user_id: user.id,
      status: "pending",
      subtotal_usd: subtotal,
      shipping_usd: shipping,
      payment_fee_usd: fees.payment_fee_usd,
      total_usd: total,
      shipping_country: address.country,
      shipping_address: shippingAddress,
      estimated_weight_g: quote.weight_g,
      exchange_rate: rate,
    })
    .select("id")
    .single();

  if (orderErr || !order) {
    return NextResponse.json(
      { error: orderErr?.message ?? "주문 생성 실패" },
      { status: 500 },
    );
  }

  const items = orderItems.map((item) => ({ ...item, order_id: order.id }));
  await db.from("order_items").insert(items);

  const paypalOrder = await createPayPalOrder(total, order.id);

  if (paypalOrder.id) {
    await db
      .from("orders")
      .update({ paypal_order_id: paypalOrder.id })
      .eq("id", order.id);

    return NextResponse.json({
      orderId: order.id,
      paypalOrderId: paypalOrder.id,
      total_usd: total,
      shipping_usd: shipping,
    });
  }

  return NextResponse.json(
    { error: "PayPal 주문 생성 실패", detail: paypalOrder },
    { status: 500 },
  );
}
