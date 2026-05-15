export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createSsrClient } from "@/lib/supabase/ssr";
import {
  SUPPORT_STATUS_LABEL,
  formatRelative,
  type SupportThread,
} from "@/lib/support";
import NewInquiry from "./new-inquiry";

const STATUS_COLOR: Record<string, string> = {
  open: "bg-amber-50 text-amber-700",
  answered: "bg-emerald-50 text-emerald-700",
  closed: "bg-gray-100 text-gray-500",
};

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function SupportPage({ searchParams }: Props) {
  const params = await searchParams;
  const orderId = params.order;

  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/support");

  const { data: threads } = await supabase
    .from("support_threads")
    .select("*")
    .eq("user_id", user.id)
    .order("last_message_at", { ascending: false });

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">문의</h1>
        <p className="text-xs opacity-60 mt-1">
          주문/배송/통관 관련 문의를 남기시면 운영자가 답변해 드립니다.
        </p>
      </header>

      <NewInquiry defaultOrderId={orderId} />

      <h2 className="text-sm font-semibold tracking-widest uppercase opacity-60 mt-8 mb-3">
        내 문의 ({threads?.length ?? 0})
      </h2>

      {!threads || threads.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-10 text-center">
          <p className="text-sm opacity-60">아직 문의 내역이 없습니다.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {(threads as SupportThread[]).map((t) => (
            <li key={t.id}>
              <Link
                href={`/support/${t.id}`}
                className="block rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 hover:border-[var(--border-strong)] transition"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      STATUS_COLOR[t.status]
                    }`}
                  >
                    {SUPPORT_STATUS_LABEL[t.status]}
                  </span>
                  {t.customer_unread > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--accent)] text-white">
                      새 답변 {t.customer_unread}
                    </span>
                  )}
                  <span className="ml-auto text-[11px] opacity-50">
                    {formatRelative(t.last_message_at)}
                  </span>
                </div>
                <p className="text-sm font-medium mt-2 truncate">{t.subject}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
