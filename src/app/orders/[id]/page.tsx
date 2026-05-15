export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSsrClient } from "@/lib/supabase/ssr";
import ShippingTimeline from "@/components/shipping-timeline";
import {
  ORDER_STATUS_LABEL,
  formatKRW,
  formatOrderDate,
  formatUSD,
  type Order,
  type OrderItem,
} from "@/lib/shop";

interface Props {
  params: Promise<{ id: string }>;
}

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  paid: "bg-blue-50 text-blue-700",
  shipping_pending: "bg-orange-50 text-orange-700",
  shipping_paid: "bg-emerald-50 text-emerald-700",
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

  const { data: orderRow } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!orderRow) notFound();
  const order = orderRow as Order;

  const { data: rows } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", id);
  const items = (rows ?? []) as OrderItem[];

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

      {/* 배송 추적 */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] mb-4 p-5">
        <h2 className="text-sm font-semibold mb-4">배송 추적</h2>

        {/* 송장 정보 */}
        {order.tracking_no && (
          <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
            <div className="text-xs">
              <span className="opacity-60">배송사</span>{" "}
              <span className="font-medium">{order.tracking_carrier ?? "우체국"}</span>
              <span className="mx-2 opacity-30">·</span>
              <span className="opacity-60">송장</span>{" "}
              <span className="font-mono font-medium">{order.tracking_no}</span>
            </div>
            {order.tracking_url && (
              <a
                href={order.tracking_url}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] px-3 py-1 rounded-full bg-[var(--primary)] text-white font-semibold"
              >
                추적하기
              </a>
            )}
          </div>
        )}

        {/* 타임라인 */}
        <ShippingTimeline order={order} isDomestic={order.shipping_country === "KR"} />
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

        {/* 1차 결제 (상품 + 수수료) */}
        <dl className="border-t border-[var(--border)] mt-2 pt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="opacity-70">상품 합계</dt>
            <dd className="font-medium">{formatUSD(order.subtotal_usd)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="opacity-70">결제 수수료</dt>
            <dd className="font-medium">{formatUSD(order.payment_fee_usd)}</dd>
          </div>
        </dl>
        <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between text-sm">
          <span className="font-semibold">결제 (상품+수수료)</span>
          <span className="font-bold">{formatUSD(order.subtotal_usd + (order.payment_fee_usd ?? 0))}</span>
        </div>

        {/* 2차 결제 (배송비) - 해외 배송만 */}
        {order.shipping_country !== "KR" && (
        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <p className="text-xs font-semibold opacity-60 mb-2">배송비 (추가결제)</p>
          {order.status === "paid" && (
            <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
              <p className="text-sm opacity-70">중량 측정 대기</p>
              <p className="text-[10px] opacity-50 mt-1">
                상품 포장 후 실제 중량을 측정하여 배송비를 이메일로 안내드립니다.
              </p>
            </div>
          )}
          {order.status === "shipping_pending" && (
            <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-orange-700">배송비 결제 대기</span>
                <span className="text-sm font-bold">{formatUSD(order.shipping_usd)}</span>
              </div>
              <p className="text-[10px] text-orange-600 mt-1">
                이메일로 발송된 결제 링크로 배송비를 결제해주세요.
              </p>
            </div>
          )}
          {(order.status === "shipping_paid" || ["shipped", "delivered"].includes(order.status)) && order.shipping_usd > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="opacity-70">배송비</span>
              <span className="font-bold text-emerald-700">{formatUSD(order.shipping_usd)} 결제 완료</span>
            </div>
          )}
        </div>
        )}

        {/* 국내 배송비 */}
        {order.shipping_country === "KR" && (
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <div className="flex items-center justify-between text-sm">
              <span className="opacity-70">국내 배송비</span>
              <span className="font-medium">₩3,000 (착불 또는 별도 안내)</span>
            </div>
          </div>
        )}

        {/* 총 결제금액 */}
        <div className="mt-4 pt-4 border-t border-[var(--border-strong)] flex items-end justify-between">
          <span className="text-xs opacity-60">총 결제금액</span>
          <div className="text-right">
            <p className="text-2xl font-extrabold tracking-tight">
              {formatUSD(order.subtotal_usd + (order.payment_fee_usd ?? 0) + (order.shipping_usd ?? 0))}
            </p>
            {rate > 0 && (
              <p className="text-xs opacity-60 mt-0.5">
                ≈ {formatKRW((order.subtotal_usd + (order.payment_fee_usd ?? 0) + (order.shipping_usd ?? 0)) * rate)}
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

      <div className="flex justify-center gap-2 mt-6">
        <Link
          href="/orders"
          className="text-xs px-4 py-2 rounded-full border border-[var(--border)] hover:bg-[var(--surface)]"
        >
          목록으로
        </Link>
        <Link
          href={`/support?order=${order.id}`}
          className="text-xs px-4 py-2 rounded-full bg-[var(--primary)] text-white font-semibold"
        >
          이 주문 문의하기
        </Link>
      </div>
    </div>
  );
}
