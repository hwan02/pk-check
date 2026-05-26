import { NextResponse } from "next/server";
import { createSsrClient } from "@/lib/supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";
import nodemailer from "nodemailer";

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

  // 이메일 알림 발송
  try {
    const db = createServerClient();
    const { data: thread } = await db
      .from("support_threads")
      .select("id, subject, user_id")
      .eq("id", threadId)
      .single();

    if (thread && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
      });

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kikidult.com";
      const threadUrl = `${siteUrl}/support/${threadId}`;

      if (senderRole === "customer") {
        // 고객이 보냄 → 어드민에게 알림
        await transporter.sendMail({
          from: `"Kikidult" <${process.env.GMAIL_USER}>`,
          to: process.env.GMAIL_USER!,
          subject: `[문의 알림] ${thread.subject ?? "새 메시지"}`,
          html: `
            <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;">
              <div style="padding:20px 0;border-bottom:1px solid #eee;">
                <h1 style="font-size:18px;font-weight:900;margin:0;">KIKIDULT</h1>
              </div>
              <div style="padding:20px 0;">
                <p style="font-size:14px;font-weight:700;margin:0 0 12px;">새 고객 문의가 도착했습니다</p>
                <p style="font-size:13px;opacity:0.7;margin:0 0 8px;">제목: ${thread.subject ?? "-"}</p>
                <div style="background:#f5f5f5;border:1px solid #eee;border-radius:8px;padding:12px;font-size:13px;margin:0 0 16px;">
                  ${text.replace(/\n/g, "<br/>")}
                </div>
                <a href="${threadUrl}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:10px 24px;border-radius:8px;font-size:13px;text-decoration:none;">답변하기</a>
              </div>
            </div>`,
        });
      } else {
        // 어드민이 답변 → 고객에게 알림
        const { data: customer } = await db
          .from("profiles")
          .select("email")
          .eq("id", thread.user_id)
          .single();

        if (customer?.email) {
          await transporter.sendMail({
            from: `"Kikidult" <${process.env.GMAIL_USER}>`,
            to: customer.email,
            subject: `[Kikidult] 문의 답변이 도착했습니다`,
            html: `
              <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;">
                <div style="padding:20px 0;border-bottom:1px solid #eee;">
                  <h1 style="font-size:18px;font-weight:900;margin:0;">KIKIDULT</h1>
                </div>
                <div style="padding:20px 0;">
                  <p style="font-size:14px;font-weight:700;margin:0 0 12px;">문의하신 내용에 답변이 등록되었습니다</p>
                  <p style="font-size:13px;opacity:0.7;margin:0 0 8px;">제목: ${thread.subject ?? "-"}</p>
                  <div style="background:#f5f5f5;border:1px solid #eee;border-radius:8px;padding:12px;font-size:13px;margin:0 0 16px;">
                    ${text.replace(/\n/g, "<br/>")}
                  </div>
                  <a href="${threadUrl}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:10px 24px;border-radius:8px;font-size:13px;text-decoration:none;">확인하기</a>
                </div>
                <div style="padding:12px 0;border-top:1px solid #eee;font-size:11px;opacity:0.5;">
                  Kikidult — TCG Market · kikidult.help@gmail.com
                </div>
              </div>`,
          });
        }
      }
    }
  } catch (e) {
    console.error("Support email notification failed:", e);
  }

  return NextResponse.json({ ok: true });
}
