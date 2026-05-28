import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { verifyPayPalWebhook } from "@/lib/paypal";

/**
 * PayPal Webhook 수신 — 환불/분쟁/캡처 알림 처리.
 *
 * PayPal Developer Dashboard 에서 다음 이벤트 구독 필요:
 *   - PAYMENT.CAPTURE.COMPLETED
 *   - PAYMENT.CAPTURE.REFUNDED
 *   - PAYMENT.CAPTURE.DENIED
 *   - PAYMENT.CAPTURE.REVERSED
 *   - CUSTOMER.DISPUTE.CREATED
 *   - CUSTOMER.DISPUTE.RESOLVED
 *
 * 환경변수: PAYPAL_WEBHOOK_ID (Webhook 등록 시 발급되는 ID).
 */

interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource: Record<string, unknown> & {
    custom_id?: string;
    invoice_id?: string;
    supplementary_data?: { related_ids?: { order_id?: string } };
    id?: string;
    status?: string;
  };
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((v, k) => (headers[k] = v));

  // 시그니처 검증
  const ok = await verifyPayPalWebhook({ headers, rawBody });
  if (!ok) {
    console.error("[paypal webhook] signature verify failed");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as PayPalWebhookEvent;
  const db = createServerClient();

  // 멱등성 — paypal_event_id 로 중복 차단 (uq_payment_events_paypal_event)
  // PayPal 이 같은 webhook 을 retry 보내도 INSERT 가 unique violation 으로 막힘
  const { data: dup } = await db
    .from("payment_events")
    .select("id")
    .eq("paypal_event_id", event.id)
    .maybeSingle();
  if (dup) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // event.resource 에서 우리 orders.id 찾기
  // create-order 시 purchase_units[].reference_id 에 orders.id 를 넣었음
  // → capture 응답의 purchase_units[0].reference_id 가 orders.id
  // → webhook 의 resource.supplementary_data.related_ids.order_id 는 paypal_order_id (혼동주의)
  // → resource.custom_id 또는 resource.invoice_id 에 우리 orders.id 있을 수도. 없으면 paypal_capture_id 로 역조회.
  let ourOrderId: string | null = null;

  const captureId = (event.resource.id ?? null) as string | null;
  const paypalOrderIdFromRel = event.resource.supplementary_data?.related_ids?.order_id ?? null;

  if (captureId) {
    const { data } = await db
      .from("orders")
      .select("id")
      .eq("paypal_capture_id", captureId)
      .maybeSingle();
    if (data) ourOrderId = data.id;
  }
  if (!ourOrderId && paypalOrderIdFromRel) {
    const { data } = await db
      .from("orders")
      .select("id")
      .eq("paypal_order_id", paypalOrderIdFromRel)
      .maybeSingle();
    if (data) ourOrderId = data.id;
  }

  // 우리 주문 못 찾아도 event 는 기록 (디버깅용)
  await db.from("payment_events").insert({
    order_id: ourOrderId,
    event_type: `webhook.${event.event_type.toLowerCase()}`,
    paypal_event_id: event.id,
    payload: event,
    source: "webhook",
  });

  if (!ourOrderId) {
    console.warn(`[paypal webhook] order not found, event=${event.event_type} id=${event.id}`);
    return NextResponse.json({ ok: true, note: "order_not_found" });
  }

  // 이벤트별 후속 처리
  switch (event.event_type) {
    case "PAYMENT.CAPTURE.REFUNDED":
    case "PAYMENT.CAPTURE.REVERSED": {
      // 환불 / 역청구 — orders.status='refunded' + 재고 복구
      await db
        .from("orders")
        .update({
          status: "refunded",
          refunded_at: new Date().toISOString(),
          cancel_reason: event.event_type === "PAYMENT.CAPTURE.REVERSED"
            ? "PayPal chargeback / reversal"
            : "PayPal 환불",
        })
        .eq("id", ourOrderId)
        .in("status", ["paid", "shipped", "delivered"]);
      // 재고 복구
      const { data: items } = await db
        .from("order_items")
        .select("listing_id, quantity")
        .eq("order_id", ourOrderId);
      const restoreItems = (items ?? [])
        .filter((i) => i.listing_id)
        .map((i) => ({ listing_id: i.listing_id, quantity: i.quantity }));
      if (restoreItems.length > 0) {
        await db.rpc("restore_stock", { items: restoreItems });
      }
      break;
    }
    case "PAYMENT.CAPTURE.DENIED": {
      // 보류된 결제가 최종 거절됨 — pending → cancelled
      await db
        .from("orders")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancel_reason: "PayPal capture denied",
        })
        .eq("id", ourOrderId)
        .eq("status", "pending");
      break;
    }
    case "CUSTOMER.DISPUTE.CREATED": {
      await db
        .from("orders")
        .update({
          admin_memo:
            // 기존 메모 보존하면서 추가
            `[${new Date().toISOString().slice(0, 10)}] PayPal 분쟁 발생`,
        })
        .eq("id", ourOrderId);
      break;
    }
    default:
      // 그 외 이벤트는 로그만
      break;
  }

  return NextResponse.json({ ok: true });
}
