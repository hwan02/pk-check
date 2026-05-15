export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSsrClient } from "@/lib/supabase/ssr";
import {
  CUSTOMS_STATUS_LABEL,
  ORDER_STATUS_LABEL,
  formatKRW,
  formatOrderDate,
  formatUSD,
  type Order,
  type OrderItem,
} from "@/lib/shop";
import { getDemoOrderById } from "@/lib/orders-mock";

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

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/orders/${id}`);

  let order: Order | null = null;
  let items: OrderItem[] = [];

  // 데모 주문 id
  if (id.startsWith("demo-")) {
    const demo = getDemoOrderById(id);
    if (demo) {
      order = demo.order;
      items = demo.items;
    }
  } else {
    const { data: o } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (o) {
      order = o as Order;
      const { data: rows } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", id);
      items = (rows ?? []) as OrderItem[];
    }
  }

  if (!order) notFound();

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const rate = order.exchange_rate ?? 0;
  const totalKrw = rate ? order.total_usd * rate : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* breadcrumb */}
      <nav className="text-xs opacity-60 mb-4 flex items-center gap-1.5">
        <Link href="/orders" className="hover:opacity-100">
          주문/배송조회
        </Link>
        <span>/</span>
        <span className="opacity-80">{order.order_no ?? id.slice(0, 8)}</span>
      </nav>

      {/* 헤더 */}
      <header className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs opacity-60">주문번호</p>
            <p className="font-mono font-semibold text-sm mt-0.5">
              {order.order_no ?? order.id}
            </p>
          </div>
          <span
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
              STATUS_COLOR[order.status] ?? "bg-gray-100 text-gray-700"
            }`}
          >
            {ORDER_STATUS_LABEL[order.status]}
          </span>
        </div>
        <p className="text-xs opacity-60 mt-3">
          주문일시 · {formatOrderDate(order.created_at)}
        </p>
      </header>

      {/* 주문 상품 */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] mb-4 overflow-hidden">
        <h2 className="text-sm font-semibold px-5 py-3 border-b border-[var(--border)]">
          주문 상품 ({totalQty}개)
        </h2>
        <ul className="divide-y divide-[var(--border)]">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-4 px-5 py-4">
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
                <p className="text-sm font-medium truncate">{it.title}</p>
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
      </section>

      {/* 통관 */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] mb-4 p-5">
        <h2 className="text-sm font-semibold mb-3">통관 (Customs)</h2>
        <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-xs">
          <dt className="opacity-60">통관 상태</dt>
          <dd className="font-medium">
            {order.customs_status
              ? CUSTOMS_STATUS_LABEL[order.customs_status]
              : "-"}
          </dd>
          <dt className="opacity-60">통관 완료</dt>
          <dd className="font-medium">
            {order.customs_cleared_at
              ? formatOrderDate(order.customs_cleared_at)
              : "-"}
          </dd>
          <dt className="opacity-60">배송사</dt>
          <dd className="font-medium">{order.tracking_carrier ?? "-"}</dd>
          <dt className="opacity-60">송장번호</dt>
          <dd className="font-medium font-mono">
            {order.tracking_no ? (
              <a
                href={order.tracking_url ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent)] underline underline-offset-2"
              >
                {order.tracking_no}
              </a>
            ) : (
              "-"
            )}
          </dd>
          <dt className="opacity-60">발송일</dt>
          <dd className="font-medium">
            {order.shipped_at ? formatOrderDate(order.shipped_at) : "-"}
          </dd>
          <dt className="opacity-60">수령일</dt>
          <dd className="font-medium">
            {order.delivered_at ? formatOrderDate(order.delivered_at) : "-"}
          </dd>
        </dl>
      </section>

      {/* 배송지 */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] mb-4 p-5">
        <h2 className="text-sm font-semibold mb-3">배송지 (Shipping Address)</h2>
        {order.shipping_address ? (
          <div className="text-xs leading-relaxed">
            <p className="font-semibold text-sm">
              {order.shipping_address.name}
            </p>
            <p className="opacity-80 mt-1">
              {order.shipping_address.line1}
              {order.shipping_address.line2
                ? `, ${order.shipping_address.line2}`
                : ""}
            </p>
            <p className="opacity-80">
              {[
                order.shipping_address.city,
                order.shipping_address.state,
                order.shipping_address.postal_code,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
            <p className="opacity-80">
              {order.shipping_address.country ?? order.shipping_country ?? ""}
            </p>
            {order.shipping_address.phone && (
              <p className="opacity-60 mt-1">
                Tel · {order.shipping_address.phone}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs opacity-60">배송지 정보 없음</p>
        )}
      </section>

      {/* 결제금액 상세 */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] mb-4 p-5">
        <h2 className="text-sm font-semibold mb-3">
          결제금액 상세 (Payment Breakdown)
        </h2>
        <ul className="divide-y divide-[var(--border)] text-sm">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex items-center justify-between py-2.5"
            >
              <span className="opacity-70 truncate pr-3">
                {it.title}{" "}
                <span className="opacity-50">× {it.quantity}</span>
              </span>
              <span className="font-medium shrink-0">
                {formatUSD(it.price_usd * it.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="border-t border-[var(--border)] mt-2 pt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="opacity-70">상품 합계</dt>
            <dd className="font-medium">{formatUSD(order.subtotal_usd)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="opacity-70">배송비</dt>
            <dd className="font-medium">{formatUSD(order.shipping_usd)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="opacity-70">대행 수수료</dt>
            <dd className="font-medium">{formatUSD(order.agent_fee_usd)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="opacity-70">결제 수수료</dt>
            <dd className="font-medium">{formatUSD(order.payment_fee_usd)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="opacity-70">계산 환율</dt>
            <dd className="font-medium">
              {rate ? `1 USD = ${formatKRW(rate)}` : "-"}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="opacity-70">예상 중량</dt>
            <dd className="font-medium">
              {order.estimated_weight_g
                ? `${order.estimated_weight_g} g`
                : "-"}
            </dd>
          </div>
        </dl>

        {/* 총 결제금액 */}
        <div className="mt-4 pt-4 border-t border-[var(--border-strong)] flex items-end justify-between">
          <span className="text-xs opacity-60">총 결제금액</span>
          <div className="text-right">
            <p className="text-2xl font-extrabold tracking-tight">
              {formatUSD(order.total_usd)}
            </p>
            {rate > 0 && (
              <p className="text-xs opacity-60 mt-0.5">
                ≈ {formatKRW(totalKrw)}
              </p>
            )}
          </div>
        </div>

        {/* 결제 수단 */}
        <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between">
          <span className="text-xs opacity-60">결제 수단</span>
          <span className="text-sm font-medium">
            {order.payment_method === "card"
              ? `신용카드 결제${
                  order.card_brand
                    ? ` · ${order.card_brand}${
                        order.card_last4 ? ` •••• ${order.card_last4}` : ""
                      }`
                    : ""
                }`
              : order.payment_method === "paypal"
                ? "PayPal"
                : order.payment_method === "bank"
                  ? "계좌이체"
                  : "-"}
          </span>
        </div>
      </section>

      <div className="flex justify-center mt-6">
        <Link
          href="/orders"
          className="text-xs px-4 py-2 rounded-full border border-[var(--border)] hover:bg-[var(--surface)]"
        >
          목록으로
        </Link>
      </div>
    </div>
  );
}
