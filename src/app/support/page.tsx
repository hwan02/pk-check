export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createSsrClient } from "@/lib/supabase/ssr";
import {
  formatRelative,
  type SupportMessage,
  type SupportThread,
} from "@/lib/support";
import MessageInput from "@/app/support/[id]/message-input";
import MarkRead from "@/app/support/[id]/mark-read";

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function SupportPage({ searchParams }: Props) {
  const params = await searchParams;
  const orderRef = params.order;

  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/support");

  // 1) 회원의 메인 스레드 find-or-create (1인 1스레드)
  const { data: existing } = await supabase
    .from("support_threads")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let thread = existing as SupportThread | null;

  if (!thread) {
    const { data: created } = await supabase
      .from("support_threads")
      .insert({
        user_id: user.id,
        subject: "Customer Support",
        admin_unread: 0, // 빈 스레드는 아직 새 메시지 없음
      })
      .select()
      .single();
    thread = created as SupportThread;
  }

  // 2) ?order= 가 있으면 주문 참조 메시지 자동 삽입 (중복 방지)
  if (orderRef && thread) {
    const { data: orderRow } = await supabase
      .from("orders")
      .select("order_no, id")
      .eq("id", orderRef)
      .eq("user_id", user.id)
      .maybeSingle();

    if (orderRow) {
      const tag = `[주문 ${orderRow.order_no ?? orderRow.id.slice(0, 8)}]`;
      // 같은 주문 참조가 마지막 5개 안에 없으면 추가
      const { data: recent } = await supabase
        .from("support_messages")
        .select("body")
        .eq("thread_id", thread.id)
        .order("created_at", { ascending: false })
        .limit(5);
      const already = (recent ?? []).some((m) =>
        (m as { body: string }).body.includes(tag),
      );
      if (!already) {
        await supabase.from("support_messages").insert({
          thread_id: thread.id,
          sender_role: "customer",
          sender_id: user.id,
          body: `${tag}\n이 주문에 대해 문의드립니다.`,
        });
      }
    }
    redirect("/support");
  }

  // 3) 메시지 조회
  const { data: msgs } = await supabase
    .from("support_messages")
    .select("*")
    .eq("thread_id", thread.id)
    .order("created_at", { ascending: true });
  const messages = (msgs ?? []) as SupportMessage[];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col min-h-[calc(100vh-200px)]">
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">고객센터 채팅</h1>
        <p className="text-xs opacity-60 mt-1">
          주문/배송/통관 등 무엇이든 물어보세요. 운영자가 영업시간 내 답변합니다.
        </p>
      </header>

      <MarkRead threadId={thread.id} side="customer" />

      {messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center rounded-2xl border border-dashed border-[var(--border)] p-10 max-w-md">
            <div className="text-3xl mb-3">💬</div>
            <p className="text-sm font-semibold">대화를 시작해보세요</p>
            <p className="text-xs opacity-60 mt-1 leading-relaxed">
              첫 메시지를 보내시면 운영자가 영업시간 내 답변해 드립니다.
              <br />
              평일 10:00 – 18:00 (KST)
            </p>
          </div>
        </div>
      ) : (
        <ul className="space-y-3 mb-4 flex-1">
          {messages.map((m) => (
            <li
              key={m.id}
              className={`flex ${m.sender_role === "customer" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line ${
                  m.sender_role === "customer"
                    ? "bg-[var(--primary)] text-white rounded-br-md"
                    : "bg-[var(--card-bg)] border border-[var(--border)] rounded-bl-md"
                }`}
              >
                <p>{m.body}</p>
                <p
                  className={`text-[10px] mt-1 ${
                    m.sender_role === "customer" ? "opacity-60" : "opacity-50"
                  }`}
                >
                  {m.sender_role === "admin" && "운영자 · "}
                  {formatRelative(m.created_at)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <MessageInput threadId={thread.id} role="customer" />
    </div>
  );
}
