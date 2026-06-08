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

function parseIsoOrNull(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v !== "string" || !v.trim()) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function parseIntOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function validateAmazonUrl(v: string): string | null {
  try {
    const u = new URL(v);
    if (/(^|\.)amazon\.co\.jp$/i.test(u.hostname)) return null;
    if (/(^|\.)amzn\.(asia|to)$/i.test(u.hostname)) return null;
    return "amazon_url must be amazon.co.jp / amzn.asia / amzn.to";
  } catch {
    return "amazon_url not a valid URL";
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    const status = auth.error === "unauthorized" ? 401 : 403;
    return NextResponse.json({ error: auth.error }, { status });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if ("category" in body) {
    const c = String(body.category);
    if (!["pokemon", "onepiece", "other"].includes(c))
      return NextResponse.json({ error: "invalid category" }, { status: 400 });
    patch.category = c;
  }
  if ("title" in body) {
    const t = String(body.title ?? "").trim();
    if (!t) return NextResponse.json({ error: "title required" }, { status: 400 });
    patch.title = t;
  }
  if ("title_ja" in body)
    patch.title_ja = typeof body.title_ja === "string" ? body.title_ja.trim() || null : null;
  if ("image_url" in body)
    patch.image_url = typeof body.image_url === "string" ? body.image_url.trim() || null : null;
  if ("apply_start_at" in body) patch.apply_start_at = parseIsoOrNull(body.apply_start_at);
  if ("apply_end_at" in body) patch.apply_end_at = parseIsoOrNull(body.apply_end_at);
  if ("draw_at" in body) patch.draw_at = parseIsoOrNull(body.draw_at);
  if ("ship_note" in body)
    patch.ship_note = typeof body.ship_note === "string" ? body.ship_note.trim() || null : null;
  if ("amazon_url" in body) {
    const v = String(body.amazon_url ?? "").trim();
    if (!v) return NextResponse.json({ error: "amazon_url required" }, { status: 400 });
    const err = validateAmazonUrl(v);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    patch.amazon_url = v;
  }
  if ("price_jpy" in body) patch.price_jpy = parseIntOrNull(body.price_jpy);
  if ("notes" in body)
    patch.notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
  if ("display_order" in body)
    patch.display_order = parseIntOrNull(body.display_order) ?? 0;
  if ("is_active" in body) patch.is_active = !!body.is_active;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  const admin = createServerClient();
  const { data, error } = await admin
    .from("raffles")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, raffle: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    const status = auth.error === "unauthorized" ? 401 : 403;
    return NextResponse.json({ error: auth.error }, { status });
  }
  const { id } = await params;
  const admin = createServerClient();
  const { error } = await admin.from("raffles").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
