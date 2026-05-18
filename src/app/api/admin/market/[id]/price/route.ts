import { NextRequest, NextResponse } from "next/server";
import { createSsrClient } from "@/lib/supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" as const };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") return { error: "forbidden" as const };
  return { user };
}

interface Ctx { params: Promise<{ id: string }> }

// 가격 history 한 행 추가
export async function POST(request: NextRequest, { params }: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    const status = auth.error === "unauthorized" ? 401 : 403;
    return NextResponse.json({ error: auth.error }, { status });
  }
  const { id } = await params;
  const body = await request.json();
  const grade = typeof body.grade === "string" ? body.grade.trim() : "";
  const priceKrw = typeof body.price_krw === "number" ? Math.round(body.price_krw) : NaN;
  const recordedAt =
    typeof body.recorded_at === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.recorded_at)
      ? body.recorded_at
      : null;

  if (!grade) return NextResponse.json({ error: "grade required" }, { status: 400 });
  if (!Number.isFinite(priceKrw) || priceKrw < 0)
    return NextResponse.json({ error: "invalid price" }, { status: 400 });

  const admin = createServerClient();
  const payload: Record<string, unknown> = { card_id: id, grade, price_krw: priceKrw };
  if (recordedAt) payload.recorded_at = recordedAt;
  const { data, error } = await admin
    .from("market_price_history")
    .insert(payload)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, row: data });
}

// 가격 history 한 행 삭제 (?row=<historyId>)
export async function DELETE(request: NextRequest, { params }: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    const status = auth.error === "unauthorized" ? 401 : 403;
    return NextResponse.json({ error: auth.error }, { status });
  }
  const { id } = await params;
  const rowId = new URL(request.url).searchParams.get("row");
  if (!rowId) return NextResponse.json({ error: "row required" }, { status: 400 });
  const admin = createServerClient();
  const { error } = await admin
    .from("market_price_history")
    .delete()
    .eq("id", rowId)
    .eq("card_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
