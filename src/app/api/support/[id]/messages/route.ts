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
  const text = typeof body.body === "string" ? body.body.trim() : "";
  const senderRole = body.sender_role === "admin" ? "admin" : "customer";
  if (!text) return NextResponse.json({ error: "내용이 비었습니다." }, { status: 400 });
  if (text.length > 5000) {
    return NextResponse.json({ error: "글자수 초과" }, { status: 400 });
  }

  // admin 권한 검증 (sender_role=admin 일 때만)
  if (senderRole === "admin") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
    }
  }

  const { error } = await supabase.from("support_messages").insert({
    thread_id: threadId,
    sender_role: senderRole,
    sender_id: user.id,
    body: text,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
