export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSsrClient } from "@/lib/supabase/ssr";
import {
  ORDER_STATUS_LABEL,
  formatOrderDate,
  formatUSD,
  type Order,
  type OrderItem,
} from "@/lib/shop";

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  paid: "bg-blue-50 text-blue-700",
  shipped: "bg-amber-50 text-amber-700",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-gray-100 text-gray-500",
  refunded: "bg-gray-100 text-gray-500",
};

export default async function OrdersPage({ searchParams }: Props) {
  const params = await searchParams;
  const success = params.success === "1";

  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/orders");

  const { data: ordersData } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", user.id)
    .neq("status", "pending")
    .order("created_at", { ascending: false });

  const orders = (ordersData ?? []) as Order[];

  const itemsByOrder = new Map<string, OrderItem[]>();
  if (orders.length > 0) {
    const ids = orders.map((o) => o.id);
    const { data: itemRows } = await supabase
      .from("order_items")
      .select("*")
      .in("order_id", ids);
    for (const it of (itemRows ?? []) as OrderItem[]) {
      const arr = itemsByOrder.get(it.order_id) ?? [];
      arr.push(it);
      itemsByOrder.set(it.order_id, arr);
    }
  }

  const displayOrders = orders;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">주문/배송조회</h1>
        <p className="text-xs opacity-60 mt-1">
          Order &amp; Shipping Tracking
        </p>
      </header>

      {success && (
        <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm text-center">
          결제가 완료되었습니다! 감사합니다.
        </div>
      )}

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-12 text-center">
          <p className="text-sm opacity-60">아직 주문 내역이 없습니다.</p>
          <Link
            href="/shop"
            className="inline-block mt-4 px-4 py-2 rounded-full bg-[var(--primary)] text-white text-xs font-semibold"
          >
            쇼핑 시작
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => {
            const items = itemsByOrder.get(o.id) ?? [];
            const totalQty = items.reduce((s, i) => s + i.quantity, 0);
            return (
              <li
                key={o.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden"
              >
                {/* 헤더: 주문일자 / 주문번호 / 상태 */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="opacity-60">
                      {formatOrderDate(o.created_at)}
                    </span>
                    <span className="opacity-30">·</span>
                    <span className="font-mono opacity-80">
                      {o.order_no ?? o.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2 py-1 rounded-full ${
                      STATUS_COLOR[o.status] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {ORDER_STATUS_LABEL[o.status]}
                  </span>
                </div>

                {/* 상품 목록: 사진 / 내용 / 단가 / 수량 */}
                <ul className="divide-y divide-[var(--border)]">
                  {items.map((it) => (
                    <li
                      key={it.id}
                      className="flex items-center gap-4 px-5 py-4"
                    >
                      <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-[var(--surface)] border border-[var(--border)]">
                        {it.image_url ? (
                          <Image
                            src={it.image_url}
                            alt={it.title}
                            fill
                            sizes="64px"
                            className="object-contain"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {it.title}
                        </p>
                        {it.title_en && (
                          <p className="text-[11px] opacity-50 truncate mt-0.5">
                            {it.title_en}
                          </p>
                        )}
                        <p className="text-xs opacity-60 mt-1">
                          {formatUSD(it.price_usd)} · 수량 {it.quantity}
                        </p>
                      </div>
                      <div className="text-right text-sm font-semibold shrink-0">
                        {formatUSD(it.price_usd * it.quantity)}
                      </div>
                    </li>
                  ))}
                </ul>

                {/* 푸터: 총액 / 상세 링크 / 배송 추적 */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)]">
                  <div className="text-xs opacity-70">
                    총 {totalQty}개 ·{" "}
                    <span className="font-semibold opacity-100">
                      {formatUSD(o.total_usd)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {o.tracking_no && (
                      <a
                        href={o.tracking_url ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs px-3 py-1.5 rounded-full border border-[var(--border)] hover:bg-[var(--surface)]"
                      >
                        배송 추적
                      </a>
                    )}
                    <Link
                      href={`/orders/${o.id}`}
                      className="text-xs px-3 py-1.5 rounded-full bg-[var(--primary)] text-white font-semibold"
                    >
                      주문 상세
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

    </div>
  );
}
