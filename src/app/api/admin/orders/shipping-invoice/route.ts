import { NextRequest, NextResponse } from "next/server";
import { createSsrClient } from "@/lib/supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";
import { sendShippingInvoice } from "@/lib/mail";

export async function POST(request: NextRequest) {
  // 어드민 확인
  const ssr = await createSsrClient();
  const { data: { user } } = await ssr.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = createServerClient();
  const { data: profile } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const { orderId, actualShippingUsd } = await request.json();
  if (!orderId || actualShippingUsd == null) {
    return NextResponse.json({ error: "orderId, actualShippingUsd 필요" }, { status: 400 });
  }

  // 주문 정보
  const { data: order } = await db
    .from("orders")
    .select("id, user_id, order_no, shipping_usd, total_usd")
    .eq("id", orderId)
    .single();
  if (!order) return NextResponse.json({ error: "주문 없음" }, { status: 404 });

  // 주문자 이메일
  const { data: orderUser } = await db
    .from("profiles")
    .select("email")
    .eq("id", order.user_id)
    .single();
  if (!orderUser?.email) {
    return NextResponse.json({ error: "주문자 이메일 없음" }, { status: 404 });
  }

  // 주문 아이템
  const { data: items } = await db
    .from("order_items")
    .select("title, quantity")
    .eq("order_id", orderId);
  const itemsSummary = (items ?? []).map((i) => `${i.title} × ${i.quantity}`).join("<br/>");
  const orderNo = order.order_no ?? orderId.slice(0, 8).toUpperCase();

  // DB에 확정 배송비 업데이트
  await db
    .from("orders")
    .update({
      shipping_usd: actualShippingUsd,
      status: "shipping_pending",
    })
    .eq("id", orderId);

  // PayPal.me 링크로 배송비 결제 유도 (간편)
  const paypalMe = process.env.PAYPAL_ME_LINK || `https://www.paypal.com/paypalme/kikidult/${actualShippingUsd}`;

  // 이메일 발송
  await sendShippingInvoice({
    to: orderUser.email,
    orderNo,
    itemsSummary,
    estimatedShippingUsd: order.shipping_usd ?? 0,
    actualShippingUsd,
    paypalPaymentLink: paypalMe,
  });

  return NextResponse.json({ ok: true, emailSentTo: orderUser.email });
}
