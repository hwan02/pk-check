import { NextResponse } from "next/server";
import { createSsrClient } from "@/lib/supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";

interface Ctx {
  params: Promise<{ id: string }>;
}

const VALID_STATUS = new Set([
  "pending",
  "paid",
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

  // 권한 확인 (쿠키 세션)
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

  // 합계 재계산: tracking 정보 들어왔는데 status가 paid라면 그대로 두고, 운영자가 명시적으로 shipped로 바꿔야 함
  // 총액은 변경하지 않음 (수수료는 결제 시점에 이미 확정)

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true, noop: true });
  }

  const db = createServerClient();
  const { error } = await db.from("orders").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
