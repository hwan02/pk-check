import { NextResponse } from "next/server";
import { createSsrClient } from "@/lib/supabase/ssr";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: Ctx) {
  const { id: threadId } = await params;
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const side = body.side === "admin" ? "admin" : "customer";

  if (side === "admin") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
    }
  }

  const update =
    side === "customer" ? { customer_unread: 0 } : { admin_unread: 0 };
  const { error } = await supabase
    .from("support_threads")
    .update(update)
    .eq("id", threadId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
