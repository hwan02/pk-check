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

  // === 멱등성: 이미 처리된 주문이면 그대로 ok 리턴 ===
  const { data: existing } = await db
    .from("orders")
    .select("id, status, paypal_capture_id, user_id")
    .eq("id", orderId)
    .single();
  if (!existing) {
    return NextResponse.json({ error: "주문이 존재하지 않습니다" }, { status: 404 });
  }
  // 다른 사용자가 호출한 경우 차단
  if (existing.user_id && existing.user_id !== user.id) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  if (existing.status === "paid" || existing.status === "shipped" || existing.status === "delivered") {
    // 재처리 방지 — 이미 결제 처리됨
    return NextResponse.json({
      ok: true,
      orderId,
      captureId: existing.paypal_capture_id,
      idempotent: true,
    });
  }
  if (existing.status === "cancelled" || existing.status === "refunded") {
    return NextResponse.json(
      { error: `이미 ${existing.status} 처리된 주문입니다` },
      { status: 409 },
    );
  }

  const capture = await capturePayPalOrder(paypalOrderId);

  // 결제 응답 원본 기록 (성공/실패 무관)
  await db.from("payment_events").insert({
    order_id: orderId,
    event_type: capture.status === "COMPLETED" ? "order_captured" : "order_capture_failed",
    payload: capture,
    source: "server",
  });

  if (capture.status !== "COMPLETED") {
    return NextResponse.json(
      { error: "결제 실패", detail: capture },
      { status: 400 },
    );
  }

  const captureId =
    capture.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? null;

  // 결제 수단 메타 추출
  const paymentSource = (capture as { payment_source?: Record<string, unknown> }).payment_source ?? {};
  const card = paymentSource.card as { brand?: string; last_digits?: string } | undefined;
  const paymentMethod: "card" | "paypal" = card ? "card" : "paypal";
  const cardBrand = card?.brand ?? null;
  const cardLast4 = card?.last_digits ?? null;

  // === atomic 재고 차감 (RPC) ===
  const { data: orderItems } = await db
    .from("order_items")
    .select("listing_id, quantity")
    .eq("order_id", orderId);

  const decItems = (orderItems ?? [])
    .filter((i) => i.listing_id)
    .map((i) => ({ listing_id: i.listing_id, quantity: i.quantity }));

  if (decItems.length > 0) {
    const { data: decResult } = await db.rpc("decrement_stock", { items: decItems });
    const result = Array.isArray(decResult) ? decResult[0] : decResult;
    if (result && result.ok === false) {
      // 재고 부족 — payment 는 이미 캡처됨. 결제는 자동으로 status='paid' 로 들어가되 운영자가 환불 처리.
      // (이 시점은 거의 안 일어남 — create-order 에서 검증함. 동시 결제 경합만 해당)
      await db.from("payment_events").insert({
        order_id: orderId,
        event_type: "stock_shortage_after_capture",
        payload: result,
        source: "server",
      });
      console.error(`[capture] 재고 부족 발생 orderId=${orderId}`, result);
      // 그래도 결제는 paid 처리 (운영자 수동 처리 필요)
    }
  }

  // === orders 업데이트 — concurrent capture 방어 (status='pending' 일 때만 update) ===
  const { data: updatedRows } = await db
    .from("orders")
    .update({
      status: "paid",
      paypal_capture_id: captureId,
      paid_at: new Date().toISOString(),
      payment_method: paymentMethod,
      card_brand: cardBrand,
      card_last4: cardLast4,
    })
    .eq("id", orderId)
    .eq("status", "pending")
    .select("id");

  if (!updatedRows || updatedRows.length === 0) {
    // 동시에 다른 호출이 먼저 처리 — idempotent 리턴
    return NextResponse.json({
      ok: true,
      orderId,
      captureId,
      idempotent: true,
      note: "concurrent capture detected",
    });
  }

  // 결제 완료된 상품만 장바구니에서 제거
  const purchasedListingIds = (orderItems ?? [])
    .map((i) => i.listing_id)
    .filter((id): id is string => !!id);
  if (purchasedListingIds.length > 0) {
    await db
      .from("cart_items")
      .delete()
      .eq("user_id", user.id)
      .in("listing_id", purchasedListingIds);
  }

  // 확인 이메일
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
