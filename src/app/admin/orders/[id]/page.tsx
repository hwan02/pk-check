export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import {
  ORDER_STATUS_LABEL,
  formatOrderDate,
  formatUSD,
  type Order,
  type OrderItem,
} from "@/lib/shop";
import OrderEditForm from "./order-edit-form";

interface Props {
  params: Promise<{ id: string }>;
}

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  paid: "bg-blue-50 text-blue-700",
  shipped: "bg-amber-50 text-amber-700",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-gray-100 text-gray-500",
  refunded: "bg-gray-100 text-gray-500",
};

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const db = createServerClient();

  const { data: orderRow } = await db
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!orderRow) notFound();
  const order = orderRow as Order;

  const [{ data: items }, { data: profileRow }] = await Promise.all([
    db.from("order_items").select("*").eq("order_id", id),
    order.user_id
      ? db
          .from("profiles")
          .select("name, email, customs_id_no")
          .eq("id", order.user_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // 주문 시점에 스냅샷된 배송지 (orders.shipping_address jsonb)
  const shippingSnap = order.shipping_address;

  const orderItems = (items ?? []) as OrderItem[];

  return (
    <div>
      <nav className="text-xs opacity-60 mb-4 flex items-center gap-1.5">
        <Link href="/admin/orders" className="hover:opacity-100">
          주문 관리
        </Link>
        <span>/</span>
        <span className="opacity-80">{order.order_no ?? id.slice(0, 8)}</span>
      </nav>

      {/* 헤더 */}
      <header className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs opacity-60">주문번호</p>
          <p className="font-mono font-semibold text-sm mt-0.5">
            {order.order_no ?? order.id}
          </p>
          <p className="text-xs opacity-60 mt-2">
            {formatOrderDate(order.created_at)}
          </p>
        </div>
        <span
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
            STATUS_COLOR[order.status]
          }`}
        >
          {ORDER_STATUS_LABEL[order.status]}
        </span>
      </header>

      {/* 고객/배송지 */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 mb-4">
        <h2 className="text-sm font-semibold mb-3">고객 / 배송지</h2>
        <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-xs">
          <dt className="opacity-60">이메일</dt>
          <dd className="font-medium">{profileRow?.email ?? "-"}</dd>
          <dt className="opacity-60">이름</dt>
          <dd className="font-medium">{profileRow?.name ?? "-"}</dd>
          <dt className="opacity-60">통관번호</dt>
          <dd className="font-mono font-medium">
            {profileRow?.customs_id_no ?? "-"}
          </dd>
          <dt className="opacity-60">수령인</dt>
          <dd className="font-medium">{shippingSnap?.name ?? "-"}</dd>
          <dt className="opacity-60">전화</dt>
          <dd className="font-medium">{shippingSnap?.phone ?? "-"}</dd>
          <dt className="opacity-60">주소</dt>
          <dd className="font-medium">
            {shippingSnap?.postal_code ? `(${shippingSnap.postal_code}) ` : ""}
            {shippingSnap?.line1}
            {shippingSnap?.line2 ? `, ${shippingSnap.line2}` : ""}
          </dd>
        </dl>
      </section>

      {/* 주문 상품 */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] mb-4 overflow-hidden">
        <h2 className="text-sm font-semibold px-5 py-3 border-b border-[var(--border)]">
          주문 상품 ({orderItems.length}건)
        </h2>
        <ul className="divide-y divide-[var(--border)]">
          {orderItems.map((it) => (
            <li key={it.id} className="flex items-center gap-4 px-5 py-3">
              <div className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-[var(--surface)] border border-[var(--border)]">
                {it.image_url ? (
                  <Image
                    src={it.image_url}
                    alt={it.title}
                    fill
                    sizes="56px"
                    className="object-contain"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{it.title}</p>
                {it.title_en && (
                  <p className="text-[11px] opacity-50 truncate">
                    {it.title_en}
                  </p>
                )}
                <p className="text-xs opacity-60">
                  {formatUSD(it.price_usd)} · 수량 {it.quantity}
                </p>
              </div>
              <div className="text-right text-sm font-semibold">
                {formatUSD(it.price_usd * it.quantity)}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 편집 폼 */}
      <OrderEditForm order={order} />
    </div>
  );
}
