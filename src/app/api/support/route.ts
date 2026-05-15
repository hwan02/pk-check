import { NextResponse } from "next/server";
import { createSsrClient } from "@/lib/supabase/ssr";

// 새 문의 스레드 생성 + 첫 메시지
export async function POST(req: Request) {
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const text = typeof body.body === "string" ? body.body.trim() : "";
  const orderId = typeof body.order_id === "string" ? body.order_id : null;
  if (!subject || !text) {
    return NextResponse.json({ error: "제목과 내용이 필요합니다." }, { status: 400 });
  }
  if (subject.length > 120 || text.length > 5000) {
    return NextResponse.json({ error: "글자수 초과" }, { status: 400 });
  }

  const { data: thread, error: tErr } = await supabase
    .from("support_threads")
    .insert({
      user_id: user.id,
      order_id: orderId,
      subject,
    })
    .select("id")
    .single();
  if (tErr || !thread) {
    return NextResponse.json({ error: tErr?.message ?? "스레드 생성 실패" }, { status: 500 });
  }

  const { error: mErr } = await supabase.from("support_messages").insert({
    thread_id: thread.id,
    sender_role: "customer",
    sender_id: user.id,
    body: text,
  });
  if (mErr) {
    return NextResponse.json({ error: mErr.message }, { status: 500 });
  }

  return NextResponse.json({ id: thread.id });
}
