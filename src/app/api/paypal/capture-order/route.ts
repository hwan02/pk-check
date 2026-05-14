import { NextRequest, NextResponse } from "next/server";
import { createSsrClient } from "@/lib/supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";
import { capturePayPalOrder } from "@/lib/paypal";

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

    await db
      .from("orders")
      .update({
        status: "paid",
        paypal_capture_id: captureId,
        paid_at: new Date().toISOString(),
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

    return NextResponse.json({ ok: true, orderId, captureId });
  }

  return NextResponse.json(
    { error: "결제 실패", detail: capture },
    { status: 400 }
  );
}
