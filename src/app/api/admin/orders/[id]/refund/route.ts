import { NextResponse } from "next/server";
import { createSsrClient } from "@/lib/supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";
import { refundPayPalCapture } from "@/lib/paypal";

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * 어드민 환불 — PayPal capture refund API 호출 + status=refunded + 재고 복구.
 *
 * body: { amount_usd?: number, reason?: string, note_to_payer?: string }
 * amount_usd 생략 시 전액 환불.
 *
 * 주의: PayPal refund 가 성공해도 webhook 으로 PAYMENT.CAPTURE.REFUNDED 가 또 들어옴 →
 * webhook 측은 paypal_event_id unique + status 가 이미 refunded 면 no-op 로 멱등 처리됨.
 */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;

  const ssr = await createSsrClient();
  const { data: { user } } = await ssr.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  const { data: profile } = await ssr
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const amount = typeof body?.amount_usd === "number" ? body.amount_usd : undefined;
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  const noteToPayer = typeof body?.note_to_payer === "string" ? body.note_to_payer.trim() : undefined;

  const db = createServerClient();
  const { data: order } = await db
    .from("orders")
    .select("id, status, paypal_capture_id, total_usd")
    .eq("id", id)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: "주문 없음" }, { status: 404 });

  if (!order.paypal_capture_id) {
    return NextResponse.json(
      { error: "PayPal capture id 가 없습니다 (결제 정보 부족)" },
      { status: 400 },
    );
  }
  if (!["paid", "shipping_paid", "shipped", "delivered"].includes(order.status)) {
    return NextResponse.json(
      { error: `현재 상태(${order.status})에서는 환불할 수 없습니다` },
      { status: 409 },
    );
  }
  if (amount !== undefined && (!Number.isFinite(amount) || amount <= 0)) {
    return NextResponse.json({ error: "환불 금액이 잘못됨" }, { status: 400 });
  }
  if (amount !== undefined && amount > order.total_usd) {
    return NextResponse.json(
      { error: `환불 금액이 결제 금액(${order.total_usd}) 초과` },
      { status: 400 },
    );
  }

  // PayPal API 호출
  const refundResp = await refundPayPalCapture(
    order.paypal_capture_id,
    amount,
    noteToPayer,
  );

  // 응답 기록 (성공/실패 무관)
  await db.from("payment_events").insert({
    order_id: id,
    event_type: refundResp.status === "COMPLETED" ? "admin_refund_completed" : "admin_refund_failed",
    payload: { request: { amount, reason, noteToPayer }, response: refundResp },
    source: "admin",
  });

  if (refundResp.status !== "COMPLETED") {
    return NextResponse.json(
      { error: "PayPal 환불 실패", detail: refundResp },
      { status: 502 },
    );
  }

  const isFullRefund = amount === undefined || amount === order.total_usd;
  const before = { status: order.status };

  if (isFullRefund) {
    // 전액 환불 — orders 상태 변경 + 재고 복구
    const { error: updErr } = await db
      .from("orders")
      .update({
        status: "refunded",
        refunded_at: new Date().toISOString(),
        cancel_reason: reason || "어드민 환불",
      })
      .eq("id", id)
      .in("status", ["paid", "shipping_paid", "shipped", "delivered"]); // 동시성 보호
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    // 재고 복구
    const { data: items } = await db
      .from("order_items")
      .select("listing_id, quantity")
      .eq("order_id", id);
    const restoreItems = (items ?? [])
      .filter((i) => i.listing_id)
      .map((i) => ({ listing_id: i.listing_id, quantity: i.quantity }));
    if (restoreItems.length > 0) {
      await db.rpc("restore_stock", { items: restoreItems });
    }

    await db.from("order_audit_log").insert({
      order_id: id,
      actor_id: user.id,
      actor_role: "admin",
      action: "refund_full",
      before_data: before,
      after_data: { status: "refunded", amount_usd: order.total_usd },
      note: reason || null,
    });
  } else {
    // 부분 환불 — status 유지, audit 만 남김
    await db.from("order_audit_log").insert({
      order_id: id,
      actor_id: user.id,
      actor_role: "admin",
      action: "refund_partial",
      before_data: before,
      after_data: { amount_usd: amount },
      note: reason || null,
    });
  }

  return NextResponse.json({
    ok: true,
    full_refund: isFullRefund,
    paypal_refund_id: refundResp.id,
  });
}
