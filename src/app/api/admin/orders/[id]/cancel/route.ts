import { NextResponse } from "next/server";
import { createSsrClient } from "@/lib/supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * 어드민 주문 취소.
 *
 * - pending: 단순 status 변경 (재고 차감 안 됐으니 복구 불필요)
 * - paid / shipping_paid: status=cancelled + 재고 복구 + 환불 권유 메시지 (실제 환불은 /refund 별도)
 * - shipped / delivered: 이미 발송됐으면 운영자가 환불(refund) 사용 권장 — 일단 막지는 않지만 경고
 * - cancelled / refunded: 차단
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
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

  const db = createServerClient();
  const { data: order } = await db
    .from("orders")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: "주문 없음" }, { status: 404 });
  if (order.status === "cancelled" || order.status === "refunded") {
    return NextResponse.json({ error: `이미 ${order.status} 처리됨` }, { status: 409 });
  }

  const before = { status: order.status };
  const needsStockRestore = order.status !== "pending";

  // 재고 복구
  if (needsStockRestore) {
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
  }

  // 상태 변경
  const { error: updErr } = await db
    .from("orders")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason || "어드민 취소",
    })
    .eq("id", id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // 이벤트 로그
  await db.from("payment_events").insert({
    order_id: id,
    event_type: "admin_cancel",
    payload: { reason, stock_restored: needsStockRestore },
    source: "admin",
  });
  await db.from("order_audit_log").insert({
    order_id: id,
    actor_id: user.id,
    actor_role: "admin",
    action: "cancel",
    before_data: before,
    after_data: { status: "cancelled" },
    note: reason || null,
  });

  return NextResponse.json({ ok: true, stock_restored: needsStockRestore });
}
