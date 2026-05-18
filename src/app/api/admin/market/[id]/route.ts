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

// 가격만 빠르게 갱신 (inline edit)
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    const status = auth.error === "unauthorized" ? 401 : 403;
    return NextResponse.json({ error: auth.error }, { status });
  }
  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  if (typeof body.price_krw === "number" && body.price_krw >= 0)
    updates.price_krw = Math.round(body.price_krw);
  if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
  if (typeof body.display_order === "number") updates.display_order = body.display_order;
  if (typeof body.notes === "string") updates.notes = body.notes.trim() || null;

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "no updates" }, { status: 400 });

  const admin = createServerClient();
  const { data, error } = await admin
    .from("market_cards")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, card: data });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    const status = auth.error === "unauthorized" ? 401 : 403;
    return NextResponse.json({ error: auth.error }, { status });
  }
  const { id } = await params;
  const admin = createServerClient();
  const { error } = await admin.from("market_cards").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
