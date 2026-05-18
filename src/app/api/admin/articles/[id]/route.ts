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

// 빠른 토글 (게시/숨김)
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    const status = auth.error === "unauthorized" ? 401 : 403;
    return NextResponse.json({ error: auth.error }, { status });
  }
  const { id } = await params;
  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (typeof body.is_published === "boolean") updates.is_published = body.is_published;
  if (typeof body.title === "string") updates.title = body.title.trim();
  if (typeof body.subtitle === "string") updates.subtitle = body.subtitle.trim() || null;
  if (typeof body.body_md === "string") updates.body_md = body.body_md;
  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "no updates" }, { status: 400 });

  const admin = createServerClient();
  const { data, error } = await admin
    .from("articles")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, article: data });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    const status = auth.error === "unauthorized" ? 401 : 403;
    return NextResponse.json({ error: auth.error }, { status });
  }
  const { id } = await params;
  const admin = createServerClient();
  const { error } = await admin.from("articles").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
