"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ORDER_STATUS_LABEL,
  formatOrderDate,
  formatUSD,
  type Order,
  type OrderItem,
} from "@/lib/shop";

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

export default function OrdersList({
  orders,
  itemsByOrder,
}: {
  orders: Order[];
  itemsByOrder: Record<string, OrderItem[]>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // 통합배송 신청 가능 조건: paid 상태 + 아직 묶이지 않음
  const isBundleable = (o: Order) => o.status === "paid" && !o.bundle_group;

  // 선택된 주문들의 배송국가가 동일한지
  const selectedCountries = useMemo(() => {
    const set = new Set<string>();
    for (const o of orders) {
      if (selected.has(o.id) && o.shipping_country) set.add(o.shipping_country);
    }
    return set;
  }, [selected, orders]);

  const canSubmit =
    selected.size >= 2 && selectedCountries.size <= 1 && !submitting;

  function toggle(id: string) {
    setMessage(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submitBundle() {
    if (!canSubmit) return;
    setSubmitting(true);
    setMessage(null);
    const res = await fetch("/api/orders/bundle", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderIds: Array.from(selected) }),
    });
    setSubmitting(false);
    if (res.ok) {
      const json = (await res.json()) as { bundleGroup: string; orderCount: number };
      setMessage({
        type: "ok",
        text: `통합배송 신청 완료 · ${json.orderCount}건 (${json.bundleGroup})`,
      });
      setSelected(new Set());
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setMessage({ type: "err", text: d.error ?? "신청 실패" });
    }
  }

  async function unbundle(orderId: string) {
    if (!confirm("이 주문의 통합배송을 해제하시겠습니까?")) return;
    const res = await fetch("/api/orders/bundle", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error ?? "해제 실패");
    }
  }

  const bundleableCount = orders.filter(isBundleable).length;

  return (
    <>
      {bundleableCount >= 2 && (
        <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-700">
          <p className="font-semibold mb-0.5">💡 통합배송 신청 가능</p>
          <p className="opacity-80">
            결제완료 주문 {bundleableCount}건이 있어요. 2건 이상 선택하면 같은 통합번호로 묶어 한 박스로 발송됩니다.
          </p>
        </div>
      )}

      {message && (
        <div
          className={`mb-4 p-3 rounded-xl text-xs ${
            message.type === "ok"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <ul className="space-y-4 pb-24">
        {orders.map((o) => {
          const items = itemsByOrder[o.id] ?? [];
          const totalQty = items.reduce((s, i) => s + i.quantity, 0);
          const bundleable = isBundleable(o);
          const checked = selected.has(o.id);
          const countryMismatch =
            checked === false &&
            selected.size > 0 &&
            o.shipping_country !== null &&
            !selectedCountries.has(o.shipping_country) &&
            selectedCountries.size > 0;

          return (
            <li
              key={o.id}
              className={`rounded-2xl border bg-[var(--card-bg)] overflow-hidden transition ${
                checked
                  ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/20"
                  : "border-[var(--border)]"
              }`}
            >
              {/* 헤더 */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
                <div className="flex items-center gap-3 text-xs">
                  {bundleable && (
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(o.id)}
                        disabled={countryMismatch}
                        className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                      />
                    </label>
                  )}
                  <span className="opacity-60">
                    {formatOrderDate(o.created_at)}
                  </span>
                  <span className="opacity-30">·</span>
                  <span className="font-mono opacity-80">
                    {o.order_no ?? o.id.slice(0, 8).toUpperCase()}
                  </span>
                  {o.bundle_group && (
                    <>
                      <span className="opacity-30">·</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        통합 {o.bundle_group}
                      </span>
                    </>
                  )}
                </div>
                <span
                  className={`text-[11px] font-semibold px-2 py-1 rounded-full ${
                    STATUS_COLOR[o.status] ?? "bg-gray-100 text-gray-700"
                  }`}
                >
                  {ORDER_STATUS_LABEL[o.status]}
                </span>
              </div>

              {/* 상품 목록 */}
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

              {/* 푸터 */}
              <div className="flex flex-wrap items-center gap-2 justify-between px-5 py-3 border-t border-[var(--border)]">
                <div className="text-xs opacity-70">
                  총 {totalQty}개 ·{" "}
                  <span className="font-semibold opacity-100">
                    {formatUSD(o.total_usd)}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {bundleable && !checked && (
                    <button
                      type="button"
                      onClick={() => toggle(o.id)}
                      disabled={countryMismatch}
                      className="text-xs px-3 py-1.5 rounded-full border border-[var(--border)] hover:border-[var(--primary)] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {countryMismatch ? "다른 국가" : "통합배송 묶기"}
                    </button>
                  )}
                  {o.bundle_group && o.status === "paid" && (
                    <button
                      type="button"
                      onClick={() => unbundle(o.id)}
                      className="text-xs px-3 py-1.5 rounded-full border border-[var(--border)] text-red-600 hover:border-red-400"
                    >
                      통합 해제
                    </button>
                  )}
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

      {/* sticky 통합배송 신청 바 */}
      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[min(640px,calc(100%-2rem))]">
          <div className="rounded-2xl bg-[var(--primary)] text-white shadow-2xl border border-black/10 px-5 py-3 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">
              통합배송 신청 · {selected.size}건 선택
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="text-xs px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20"
              >
                취소
              </button>
              <button
                type="button"
                onClick={submitBundle}
                disabled={!canSubmit}
                className="text-xs font-bold px-4 py-1.5 rounded-full bg-white text-[var(--primary)] disabled:opacity-50"
              >
                {submitting ? "신청 중..." : "신청하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
