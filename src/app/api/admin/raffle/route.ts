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
  if (typeof v !== "string" || !v.trim()) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function parseIntOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    const status = auth.error === "unauthorized" ? 401 : 403;
    return NextResponse.json({ error: auth.error }, { status });
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const category = String(body.category ?? "");
  const title = String(body.title ?? "").trim();
  const amazonUrl = String(body.amazon_url ?? "").trim();

  if (!["pokemon", "onepiece", "other"].includes(category))
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
  if (!amazonUrl) return NextResponse.json({ error: "amazon_url required" }, { status: 400 });
  try {
    const u = new URL(amazonUrl);
    if (!/(^|\.)amazon\.co\.jp$/i.test(u.hostname) && !/(^|\.)amzn\.(asia|to)$/i.test(u.hostname)) {
      return NextResponse.json({ error: "amazon_url must be amazon.co.jp / amzn.asia / amzn.to" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "amazon_url not a valid URL" }, { status: 400 });
  }

  const row = {
    category,
    title,
    title_ja: typeof body.title_ja === "string" ? body.title_ja.trim() || null : null,
    image_url: typeof body.image_url === "string" ? body.image_url.trim() || null : null,
    apply_start_at: parseIsoOrNull(body.apply_start_at),
    apply_end_at: parseIsoOrNull(body.apply_end_at),
    draw_at: parseIsoOrNull(body.draw_at),
    ship_note: typeof body.ship_note === "string" ? body.ship_note.trim() || null : null,
    amazon_url: amazonUrl,
    price_jpy: parseIntOrNull(body.price_jpy),
    notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
    display_order: parseIntOrNull(body.display_order) ?? 0,
    is_active: body.is_active === false ? false : true,
  };

  const admin = createServerClient();
  const { data, error } = await admin.from("raffles").insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, raffle: data });
}
