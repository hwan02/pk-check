import { NextResponse } from "next/server";
import { createSsrClient } from "@/lib/supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";
import { trackingUrlFor } from "@/lib/tracking";

interface Ctx {
  params: Promise<{ id: string }>;
}

const VALID_STATUS = new Set([
  "pending",
  "paid",
  "shipping_pending",
  "shipping_paid",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);
const VALID_CUSTOMS = new Set(["pending", "in_review", "cleared", "held"]);

function optStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

function optNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function PATCH(req: Request, { params }: Ctx) {
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

  const update: Record<string, unknown> = {};

  if (typeof body.status === "string") {
    if (!VALID_STATUS.has(body.status)) {
      return NextResponse.json({ error: "잘못된 상태" }, { status: 400 });
    }
    // cancelled/refunded 는 별도 액션 라우트(/cancel, /refund) 사용 권장
    if (body.status === "cancelled" || body.status === "refunded") {
      return NextResponse.json(
        { error: `${body.status} 상태는 /cancel 또는 /refund 액션으로 변경해 주세요 (재고 복구 + PayPal 처리 필요)` },
        { status: 400 },
      );
    }
    update.status = body.status;
    if (body.status === "shipped") update.shipped_at = new Date().toISOString();
    if (body.status === "delivered") update.delivered_at = new Date().toISOString();
  }

  if (typeof body.customs_status === "string") {
    if (!VALID_CUSTOMS.has(body.customs_status)) {
      return NextResponse.json({ error: "잘못된 통관 상태" }, { status: 400 });
    }
    update.customs_status = body.customs_status;
    if (body.customs_status === "cleared") {
      update.customs_cleared_at = new Date().toISOString();
    }
  }

  if ("tracking_carrier" in body) update.tracking_carrier = optStr(body.tracking_carrier);
  if ("tracking_no" in body) update.tracking_no = optStr(body.tracking_no);
  if ("tracking_url" in body) update.tracking_url = optStr(body.tracking_url);

  // tracking_no / tracking_carrier 가 들어오는데 tracking_url 이 비어있으면 자동 생성
  if (
    ("tracking_no" in body || "tracking_carrier" in body) &&
    !update.tracking_url
  ) {
    const carrier = (update.tracking_carrier as string | null) ?? null;
    const no = (update.tracking_no as string | null) ?? null;
    const auto = trackingUrlFor(carrier, no);
    if (auto) update.tracking_url = auto;
  }

  if ("payment_fee_usd" in body) update.payment_fee_usd = optNum(body.payment_fee_usd) ?? 0;
  if ("exchange_rate" in body) update.exchange_rate = optNum(body.exchange_rate);
  if ("estimated_weight_g" in body) {
    const w = optNum(body.estimated_weight_g);
    update.estimated_weight_g = w === null ? null : Math.round(w);
  }
  if ("card_brand" in body) update.card_brand = optStr(body.card_brand);
  if ("card_last4" in body) {
    const c = optStr(body.card_last4);
    if (c && !/^\d{4}$/.test(c)) {
      return NextResponse.json(
        { error: "카드 끝 4자리는 숫자 4자입니다." },
        { status: 400 },
      );
    }
    update.card_last4 = c;
  }
  if ("admin_memo" in body) update.admin_memo = optStr(body.admin_memo);

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true, noop: true });
  }

  const db = createServerClient();

  // before snapshot — audit 용
  const { data: before } = await db
    .from("orders")
    .select(
      "status, tracking_carrier, tracking_no, tracking_url, customs_status, " +
        "payment_fee_usd, exchange_rate, estimated_weight_g, card_brand, card_last4, admin_memo",
    )
    .eq("id", id)
    .maybeSingle();

  const { error } = await db.from("orders").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // audit log
  if (before) {
    // 실제 변경된 키만 추리기
    const changed: Record<string, { before: unknown; after: unknown }> = {};
    for (const [k, v] of Object.entries(update)) {
      const beforeVal = (before as unknown as Record<string, unknown>)[k];
      if (beforeVal !== v) changed[k] = { before: beforeVal, after: v };
    }
    if (Object.keys(changed).length > 0) {
      await db.from("order_audit_log").insert({
        order_id: id,
        actor_id: user.id,
        actor_role: "admin",
        action: update.status ? "status_change" : "update",
        before_data: Object.fromEntries(Object.entries(changed).map(([k, v]) => [k, v.before])),
        after_data: Object.fromEntries(Object.entries(changed).map(([k, v]) => [k, v.after])),
      });
    }
  }

  return NextResponse.json({ ok: true, auto_tracking_url: update.tracking_url ?? null });
}
