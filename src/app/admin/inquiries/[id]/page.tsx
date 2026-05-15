export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import {
  SUPPORT_STATUS_LABEL,
  formatRelative,
  type SupportMessage,
  type SupportThread,
} from "@/lib/support";
import MessageInput from "@/app/support/[id]/message-input";
import MarkRead from "@/app/support/[id]/mark-read";

interface Props {
  params: Promise<{ id: string }>;
}

const STATUS_COLOR: Record<string, string> = {
  open: "bg-amber-50 text-amber-700",
  answered: "bg-emerald-50 text-emerald-700",
  closed: "bg-gray-100 text-gray-500",
};

export default async function AdminInquiryDetailPage({ params }: Props) {
  const { id } = await params;
  const db = createServerClient();

  const { data: threadRow } = await db
    .from("support_threads")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!threadRow) notFound();
  const thread = threadRow as SupportThread;

  const [{ data: msgs }, { data: profile }] = await Promise.all([
    db.from("support_messages").select("*").eq("thread_id", id).order("created_at"),
    db.from("profiles")
      .select("email, name, phone")
      .eq("id", thread.user_id)
      .maybeSingle(),
  ]);
  const messages = (msgs ?? []) as SupportMessage[];

  return (
    <div>
      <nav className="text-xs opacity-60 mb-4 flex items-center gap-1.5">
        <Link href="/admin/inquiries" className="hover:opacity-100">문의 관리</Link>
        <span>/</span>
        <span className="opacity-80 truncate">{thread.subject}</span>
      </nav>

      <header className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              STATUS_COLOR[thread.status]
            }`}
          >
            {SUPPORT_STATUS_LABEL[thread.status]}
          </span>
          {thread.order_id && (
            <Link
              href={`/admin/orders/${thread.order_id}`}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--surface)] hover:bg-[var(--border)]"
            >
              주문 보기
            </Link>
          )}
          <span className="ml-auto text-[11px] opacity-50">
            {formatRelative(thread.created_at)}
          </span>
        </div>
        <h1 className="text-lg font-bold">{thread.subject}</h1>
        <p className="text-xs opacity-70 mt-2">
          {(profile as { email?: string } | null)?.email ?? "-"}
          {(profile as { name?: string } | null)?.name && (
            <> · {(profile as { name?: string }).name}</>
          )}
          {(profile as { phone?: string } | null)?.phone && (
            <> · {(profile as { phone?: string }).phone}</>
          )}
        </p>
      </header>

      <MarkRead threadId={thread.id} side="admin" />

      <ul className="space-y-3 mb-6">
        {messages.map((m) => (
          <li
            key={m.id}
            className={`flex ${m.sender_role === "admin" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line ${
                m.sender_role === "admin"
                  ? "bg-[var(--primary)] text-white rounded-br-md"
                  : "bg-[var(--card-bg)] border border-[var(--border)] rounded-bl-md"
              }`}
            >
              <p>{m.body}</p>
              <p
                className={`text-[10px] mt-1 ${
                  m.sender_role === "admin" ? "opacity-60" : "opacity-50"
                }`}
              >
                {m.sender_role === "customer" && "회원 · "}
                {formatRelative(m.created_at)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <MessageInput threadId={thread.id} role="admin" />
    </div>
  );
}
