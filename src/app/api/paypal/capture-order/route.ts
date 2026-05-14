import { NextRequest, NextResponse } from "next/server";
import { createSsrClient } from "@/lib/supabase/ssr";
import { capturePayPalOrder } from "@/lib/paypal";

export async function POST(request: NextRequest) {
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { paypalOrderId, orderId: rawOrderId } = await request.json();
  if (!paypalOrderId) {
    return NextResponse.json({ error: "paypalOrderId 필요" }, { status: 400 });
  }

  // orderId가 없으면 paypalOrderId로 DB에서 찾기
  let orderId = rawOrderId;
  if (!orderId) {
    const { data: order } = await supabase
      .from("orders")
      .select("id")
      .eq("paypal_order_id", paypalOrderId)
      .single();
    orderId = order?.id;
  }
  if (!orderId) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다" }, { status: 404 });
  }

  // PayPal 결제 캡처
  const capture = await capturePayPalOrder(paypalOrderId);

  if (capture.status === "COMPLETED") {
    const captureId =
      capture.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? null;

    // 주문 상태 업데이트
    await supabase
      .from("orders")
      .update({
        status: "paid",
        paypal_capture_id: captureId,
        paid_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    // 재고 차감
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("listing_id, quantity")
      .eq("order_id", orderId);

    for (const item of orderItems ?? []) {
      if (item.listing_id) {
        await supabase.rpc("decrement_stock", {
          p_listing_id: item.listing_id,
          p_qty: item.quantity,
        }).then(({ error }) => {
          // rpc 없으면 직접 업데이트
          if (error) {
            supabase
              .from("listings")
              .update({ stock: Math.max(0, 0) }) // fallback
              .eq("id", item.listing_id!);
          }
        });
      }
    }

    // 장바구니 비우기
    await supabase.from("cart_items").delete().eq("user_id", user.id);

    return NextResponse.json({ ok: true, orderId, captureId });
  }

  return NextResponse.json(
    { error: "결제 실패", detail: capture },
    { status: 400 }
  );
}
