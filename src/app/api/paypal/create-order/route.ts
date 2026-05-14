import { NextRequest, NextResponse } from "next/server";
import { createSsrClient } from "@/lib/supabase/ssr";
import { createPayPalOrder } from "@/lib/paypal";

export async function POST(request: NextRequest) {
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { shippingAddress } = await request.json();

  // 장바구니 가져오기
  const { data: cartItems } = await supabase
    .from("cart_items")
    .select("*, listing:listings(*)")
    .eq("user_id", user.id);

  if (!cartItems?.length) {
    return NextResponse.json({ error: "장바구니가 비어있습니다" }, { status: 400 });
  }

  // 소계 계산
  const subtotal = cartItems.reduce((sum, item) => {
    const price = (item.listing as { price_usd: number })?.price_usd ?? 0;
    return sum + price * item.quantity;
  }, 0);
  const shipping = 0; // 무료배송 or 추후 설정
  const total = subtotal + shipping;

  // DB에 주문 생성 (status: pending)
  const orderItems = cartItems.map((item) => {
    const listing = item.listing as { id: string; title: string; title_en: string | null; image_url: string | null; price_usd: number };
    return {
      listing_id: listing.id,
      title: listing.title,
      title_en: listing.title_en,
      image_url: listing.image_url,
      price_usd: listing.price_usd,
      quantity: item.quantity,
    };
  });

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      status: "pending",
      subtotal_usd: subtotal,
      shipping_usd: shipping,
      total_usd: total,
      shipping_address: shippingAddress || null,
    })
    .select("id")
    .single();

  if (orderErr || !order) {
    return NextResponse.json({ error: orderErr?.message ?? "주문 생성 실패" }, { status: 500 });
  }

  // 주문 아이템 저장
  const items = orderItems.map((item) => ({ ...item, order_id: order.id }));
  await supabase.from("order_items").insert(items);

  // PayPal 주문 생성
  const paypalOrder = await createPayPalOrder(total, order.id);

  if (paypalOrder.id) {
    // DB에 PayPal order ID 저장
    await supabase
      .from("orders")
      .update({ paypal_order_id: paypalOrder.id })
      .eq("id", order.id);

    return NextResponse.json({
      orderId: order.id,
      paypalOrderId: paypalOrder.id,
    });
  }

  return NextResponse.json({ error: "PayPal 주문 생성 실패" }, { status: 500 });
}
