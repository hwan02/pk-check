import { NextRequest, NextResponse } from "next/server";
import { createSsrClient } from "@/lib/supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";
import { capturePayPalOrder } from "@/lib/paypal";
import { sendOrderConfirmation } from "@/lib/mail";

export async function POST(request: NextRequest) {
  const ssrClient = await createSsrClient();
  const { data: { user } } = await ssrClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const db = createServerClient();

  const { paypalOrderId, orderId: rawOrderId } = await request.json();
  if (!paypalOrderId) {
    return NextResponse.json({ error: "paypalOrderId 필요" }, { status: 400 });
  }

  let orderId = rawOrderId;
  if (!orderId) {
    const { data: order } = await db
      .from("orders")
      .select("id")
      .eq("paypal_order_id", paypalOrderId)
      .single();
    orderId = order?.id;
  }
  if (!orderId) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다" }, { status: 404 });
  }

  const capture = await capturePayPalOrder(paypalOrderId);

  if (capture.status === "COMPLETED") {
    const captureId =
      capture.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? null;

    // 결제 수단 메타 추출 (PayPal 지갑 / 카드 funding)
    const paymentSource = (capture as { payment_source?: Record<string, unknown> }).payment_source ?? {};
    const card = paymentSource.card as
      | { brand?: string; last_digits?: string }
      | undefined;
    const paymentMethod: "card" | "paypal" = card ? "card" : "paypal";
    const cardBrand = card?.brand ?? null;
    const cardLast4 = card?.last_digits ?? null;

    await db
      .from("orders")
      .update({
        status: "paid",
        paypal_capture_id: captureId,
        paid_at: new Date().toISOString(),
        payment_method: paymentMethod,
        card_brand: cardBrand,
        card_last4: cardLast4,
      })
      .eq("id", orderId);

    // 재고 차감
    const { data: orderItems } = await db
      .from("order_items")
      .select("listing_id, quantity")
      .eq("order_id", orderId);

    for (const item of orderItems ?? []) {
      if (item.listing_id) {
        const { data: listing } = await db
          .from("listings")
          .select("stock")
          .eq("id", item.listing_id)
          .single();
        if (listing) {
          await db
            .from("listings")
            .update({ stock: Math.max(0, listing.stock - item.quantity) })
            .eq("id", item.listing_id);
        }
      }
    }

    // 장바구니 비우기
    await db.from("cart_items").delete().eq("user_id", user.id);

    // 주문 확인 이메일 발송
    try {
      const { data: orderData } = await db
        .from("orders")
        .select("total_usd, shipping_usd, order_no")
        .eq("id", orderId)
        .single();
      const { data: items } = await db
        .from("order_items")
        .select("title, quantity")
        .eq("order_id", orderId);
      const itemsSummary = (items ?? []).map((i) => `${i.title} × ${i.quantity}`).join("<br/>");
      const orderNo = orderData?.order_no ?? orderId.slice(0, 8).toUpperCase();

      await sendOrderConfirmation({
        to: user.email!,
        orderNo,
        itemsSummary,
        totalUsd: orderData?.total_usd ?? 0,
        estimatedShippingUsd: orderData?.shipping_usd ?? 0,
      });
    } catch (e) {
      console.error("Order confirmation email failed:", e);
    }

    return NextResponse.json({ ok: true, orderId, captureId });
  }

  return NextResponse.json(
    { error: "결제 실패", detail: capture },
    { status: 400 }
  );
}
