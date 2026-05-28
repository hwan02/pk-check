export const dynamic = "force-dynamic";

import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import {
  CUSTOMS_STATUS_LABEL,
  ORDER_STATUS_LABEL,
  formatOrderDate,
  formatUSD,
  type Order,
  type OrderItem,
  type OrderStatus,
} from "@/lib/shop";

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "", label: "전체" },
  { value: "paid", label: "발송대기" },
  { value: "shipped", label: "배송중" },
  { value: "delivered", label: "배송완료" },
  { value: "cancelled", label: "취소/환불" },
];

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  paid: "bg-blue-50 text-blue-700",
  shipping_pending: "bg-orange-50 text-orange-700",
  shipping_paid: "bg-indigo-50 text-indigo-700",
  shipped: "bg-amber-50 text-amber-700",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-gray-100 text-gray-500",
  refunded: "bg-rose-50 text-rose-700",
};

export default async function AdminOrdersPage({ searchParams }: Props) {
  const params = await searchParams;
  const status = params.status ?? "";

  const db = createServerClient();
  let query = db
    .from("orders")
    .select("*")
    .neq("status", "pending")
    .order("created_at", { ascending: false });

  if (status === "cancelled") {
    query = query.in("status", ["cancelled", "refunded"]);
  } else if (status) {
    query = query.eq("status", status as OrderStatus);
  }

  const { data: ordersData } = await query.limit(100);
  const orders = (ordersData ?? []) as Order[];

  // 아이템 / 사용자 한꺼번에 조회
  let itemsByOrder = new Map<string, OrderItem[]>();
  let userEmailById = new Map<string, string>();
  if (orders.length > 0) {
    const ids = orders.map((o) => o.id);
    const userIds = Array.from(
      new Set(orders.map((o) => o.user_id).filter((x): x is string => !!x)),
    );

    const [itemRows, userRows] = await Promise.all([
      db.from("order_items").select("*").in("order_id", ids),
      userIds.length > 0
        ? db.from("profiles").select("id, email").in("id", userIds)
        : Promise.resolve({ data: [] as { id: string; email: string | null }[] }),
    ]);

    for (const it of (itemRows.data ?? []) as OrderItem[]) {
      const arr = itemsByOrder.get(it.order_id) ?? [];
      arr.push(it);
      itemsByOrder.set(it.order_id, arr);
    }
    for (const u of userRows.data ?? []) {
      if (u.email) userEmailById.set(u.id, u.email);
    }
  }

  // 카운터
  const counts = {
    paid: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  };
  {
    const { data: allStatuses } = await db
      .from("orders")
      .select("status")
      .neq("status", "pending");
    for (const r of allStatuses ?? []) {
      const s = (r as { status: string }).status;
      if (s === "paid") counts.paid++;
      else if (s === "shipped") counts.shipped++;
      else if (s === "delivered") counts.delivered++;
      else if (s === "cancelled" || s === "refunded") counts.cancelled++;
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">주문 관리</h1>
        <Link
          href="/admin/orders"
          className="text-xs opacity-60 hover:opacity-100"
        >
          새로고침
        </Link>
      </div>

      {/* 상태 필터 */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {STATUS_TABS.map((t) => {
          const count =
            t.value === "paid"
              ? counts.paid
              : t.value === "shipped"
                ? counts.shipped
                : t.value === "delivered"
                  ? counts.delivered
                  : t.value === "cancelled"
                    ? counts.cancelled
                    : counts.paid + counts.shipped + counts.delivered + counts.cancelled;
          const active = status === t.value;
          return (
            <Link
              key={t.value || "all"}
              href={t.value ? `/admin/orders?status=${t.value}` : "/admin/orders"}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                active
                  ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                  : "border-[var(--border)] hover:bg-[var(--surface)]"
              }`}
            >
              {t.label}
              <span
                className={`ml-1.5 ${active ? "opacity-80" : "opacity-50"}`}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {/* 발송대기 알림 */}
      {!status && counts.paid > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          <strong>발송 대기 {counts.paid}건</strong> · 결제 완료 후 운송장 입력이 필요합니다.{" "}
          <Link
            href="/admin/orders?status=paid"
            className="underline underline-offset-2 font-semibold"
          >
            지금 처리 →
          </Link>
        </div>
      )}

      {/* 목록 */}
      {orders.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-12 text-center">
          <p className="text-sm opacity-60">해당 상태의 주문이 없습니다.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead className="bg-[var(--surface)] text-[11px] uppercase tracking-wider opacity-60">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold w-[120px]">주문일</th>
                <th className="text-left px-4 py-2.5 font-semibold w-[170px]">주문번호</th>
                <th className="text-left px-4 py-2.5 font-semibold w-[180px]">고객</th>
                <th className="text-left px-4 py-2.5 font-semibold">상품</th>
                <th className="text-right px-4 py-2.5 font-semibold w-[100px]">금액</th>
                <th className="text-left px-4 py-2.5 font-semibold w-[90px]">결제</th>
                <th className="text-left px-4 py-2.5 font-semibold w-[80px]">통관</th>
                <th className="text-left px-4 py-2.5 font-semibold w-[140px]">송장</th>
                <th className="px-4 py-2.5 w-[80px]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {orders.map((o) => {
                const items = itemsByOrder.get(o.id) ?? [];
                const totalQty = items.reduce((s, i) => s + i.quantity, 0);
                const firstTitle = items[0]?.title ?? null;
                const moreCount = items.length > 1 ? items.length - 1 : 0;
                const isEmpty = items.length === 0;
                return (
                  <tr key={o.id} className="hover:bg-[var(--surface)]/60 align-top">
                    <td className="px-4 py-3 text-xs whitespace-nowrap opacity-80">
                      {formatOrderDate(o.created_at)}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono whitespace-nowrap">
                      {o.order_no ?? (
                        <span className="opacity-50">{o.id.slice(0, 8)} (no#)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs opacity-80 truncate max-w-[180px]">
                      {o.user_id ? userEmailById.get(o.user_id) ?? "-" : "비회원"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {isEmpty ? (
                        <span className="opacity-40 italic">아이템 없음</span>
                      ) : (
                        <div className="max-w-[260px]">
                          <span className="truncate block">{firstTitle}</span>
                          <span className="text-[10px] opacity-50">
                            {moreCount > 0 && `외 ${moreCount}건 · `}
                            총 {totalQty}개
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-right font-semibold whitespace-nowrap">
                      {formatUSD(o.total_usd)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${
                          STATUS_COLOR[o.status] ?? ""
                        }`}
                      >
                        {ORDER_STATUS_LABEL[o.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs opacity-80 whitespace-nowrap">
                      {o.customs_status
                        ? CUSTOMS_STATUS_LABEL[o.customs_status]
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono opacity-80">
                      {o.tracking_no ? (
                        <span className="whitespace-nowrap">
                          {o.tracking_carrier ? (
                            <span className="opacity-60 mr-1">
                              {o.tracking_carrier}
                            </span>
                          ) : null}
                          {o.tracking_no}
                        </span>
                      ) : (
                        <span className="opacity-40">미입력</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="text-xs px-3 py-1 rounded-full bg-[var(--primary)] text-white font-semibold"
                      >
                        처리
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {orders.length >= 100 && (
        <p className="mt-3 text-[11px] opacity-60 text-right">
          최근 100건만 표시됩니다.
        </p>
      )}
    </div>
  );
}
