export const dynamic = "force-dynamic";

import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import {
  SUPPORT_STATUS_LABEL,
  formatRelative,
  type SupportThread,
} from "@/lib/support";

const STATUS_COLOR: Record<string, string> = {
  open: "bg-amber-50 text-amber-700",
  answered: "bg-emerald-50 text-emerald-700",
  closed: "bg-gray-100 text-gray-500",
};

export default async function AdminInquiriesPage() {
  const db = createServerClient();

  const { data: threads } = await db
    .from("support_threads")
    .select("*")
    .order("last_message_at", { ascending: false })
    .limit(200);

  const userIds = Array.from(
    new Set(((threads ?? []) as SupportThread[]).map((t) => t.user_id)),
  );
  const emailById = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id, email")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      if ((p as { email: string | null }).email) {
        emailById.set((p as { id: string }).id, (p as { email: string }).email);
      }
    }
  }

  const unread = ((threads ?? []) as SupportThread[]).filter(
    (t) => t.admin_unread > 0,
  ).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">문의 관리</h1>
        {unread > 0 && (
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[var(--accent)] text-white">
            새 메시지 {unread}
          </span>
        )}
      </div>

      {!threads || threads.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-12 text-center">
          <p className="text-sm opacity-60">아직 문의가 없습니다.</p>
        </div>
      ) : (
        <ul className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden divide-y divide-[var(--border)]">
          {(threads as SupportThread[]).map((t) => (
            <li key={t.id}>
              <Link
                href={`/admin/inquiries/${t.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface)]"
              >
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    STATUS_COLOR[t.status]
                  }`}
                >
                  {SUPPORT_STATUS_LABEL[t.status]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{t.subject}</p>
                  <p className="text-[11px] opacity-60 truncate">
                    {emailById.get(t.user_id) ?? "-"}
                    {t.order_id && <> · 주문연계</>}
                  </p>
                </div>
                {t.admin_unread > 0 && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--accent)] text-white shrink-0">
                    +{t.admin_unread}
                  </span>
                )}
                <span className="text-[11px] opacity-50 shrink-0">
                  {formatRelative(t.last_message_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
