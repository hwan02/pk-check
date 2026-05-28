import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/**
 * 결제 안 끝낸 pending 주문 자동 정리.
 *
 * 30분 이상 된 pending 주문 → status='cancelled' 로 변경.
 * (PayPal create-order 했지만 capture 안 한 케이스 — 사용자가 도중 이탈)
 *
 * Vercel Cron 으로 매 시간 호출 (vercel.json 의 crons 참조).
 * 보안: CRON_SECRET 환경변수로 보호 — 외부 호출 차단.
 */
export async function GET(request: NextRequest) {
  // Vercel Cron 은 자동으로 Authorization: Bearer ${CRON_SECRET} 를 붙임
  const auth = request.headers.get("authorization") ?? "";
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = createServerClient();
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30분 전

  const { data: expired, error } = await db
    .from("orders")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancel_reason: "auto-expired (30min)",
    })
    .eq("status", "pending")
    .lt("created_at", cutoff)
    .select("id");
  if (error) {
    console.error("[cron expire] failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const n = (expired ?? []).length;
  // 이벤트 로그 (감사용)
  if (n > 0) {
    const events = (expired ?? []).map((o) => ({
      order_id: o.id,
      event_type: "auto_expired",
      payload: { reason: "no_capture_30min" },
      source: "cron" as const,
    }));
    await db.from("payment_events").insert(events);
  }

  return NextResponse.json({ ok: true, expired: n });
}
