"use client";

import { useState } from "react";
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

const isBundleable = (o: Order) => o.status === "paid" && !o.bundle_group;

export default function OrdersList({
  orders,
  itemsByOrder,
}: {
  orders: Order[];
  itemsByOrder: Record<string, OrderItem[]>;
}) {
  const router = useRouter();
  const [bundleSourceId, setBundleSourceId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const sourceOrder = orders.find((o) => o.id === bundleSourceId) ?? null;

  // 모달에서 함께 묶을 후보 주문 (같은 배송국가 + paid + 미묶음 + 자기 자신 제외)
  const candidates = sourceOrder
    ? orders.filter(
        (o) =>
          o.id !== sourceOrder.id &&
          isBundleable(o) &&
          o.shipping_country === sourceOrder.shipping_country,
      )
    : [];

  async function unbundle(orderId: string) {
    if (!confirm("이 주문의 통합배송을 해제하시겠습니까?")) return;
    const res = await fetch("/api/orders/bundle", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    if (res.ok) router.refresh();
    else {
      const d = await res.json().catch(() => ({}));
      alert(d.error ?? "해제 실패");
    }
  }

  return (
    <>
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

      <ul className="space-y-4">
        {orders.map((o) => {
          const items = itemsByOrder[o.id] ?? [];
          const totalQty = items.reduce((s, i) => s + i.quantity, 0);
          const bundleable = isBundleable(o);

          return (
            <li
              key={o.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden"
            >
              {/* 헤더 */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
                <div className="flex items-center gap-3 text-xs flex-wrap">
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
                  {bundleable && (
                    <button
                      type="button"
                      onClick={() => {
                        setMessage(null);
                        setBundleSourceId(o.id);
                      }}
                      className="text-xs px-3 py-1.5 rounded-full border border-[var(--border)] hover:border-[var(--primary)]"
                    >
                      통합배송 신청
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

      {/* 통합배송 신청 모달 */}
      {sourceOrder && (
        <BundleModal
          source={sourceOrder}
          candidates={candidates}
          itemsByOrder={itemsByOrder}
          onClose={() => setBundleSourceId(null)}
          onSubmitted={(json) => {
            setBundleSourceId(null);
            setMessage({
              type: "ok",
              text: `통합배송 신청 완료 · ${json.orderCount}건 (${json.bundleGroup})`,
            });
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function BundleModal({
  source,
  candidates,
  itemsByOrder,
  onClose,
  onSubmitted,
}: {
  source: Order;
  candidates: Order[];
  itemsByOrder: Record<string, OrderItem[]>;
  onClose: () => void;
  onSubmitted: (json: { bundleGroup: string; orderCount: number }) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function toggle(id: string) {
    setError("");
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (selected.size === 0) {
      setError("함께 묶을 주문을 1건 이상 선택하세요");
      return;
    }
    setSubmitting(true);
    setError("");
    const orderIds = [source.id, ...Array.from(selected)];
    const res = await fetch("/api/orders/bundle", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderIds }),
    });
    setSubmitting(false);
    if (res.ok) {
      const json = (await res.json()) as { bundleGroup: string; orderCount: number };
      onSubmitted(json);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "신청 실패");
    }
  }

  const sourceTitle = (itemsByOrder[source.id]?.[0]?.title ?? "") +
    (itemsByOrder[source.id] && itemsByOrder[source.id].length > 1
      ? ` 외 ${itemsByOrder[source.id].length - 1}건`
      : "");

  return (
    <div
      className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-base font-bold">통합배송 신청</h2>
          <p className="text-xs opacity-60 mt-1">
            기준 주문{" "}
            <span className="font-mono opacity-80">
              {source.order_no ?? source.id.slice(0, 8).toUpperCase()}
            </span>
            {sourceTitle && <> · {sourceTitle}</>}
          </p>
          <p className="text-[11px] opacity-60 mt-2">
            아래 주문 중 함께 묶어 발송할 주문을 선택해 주세요. 같은 배송 국가의 결제완료 주문만 표시됩니다.
          </p>
        </header>

        <div className="max-h-[50vh] overflow-y-auto">
          {candidates.length === 0 ? (
            <p className="px-5 py-10 text-center text-xs opacity-60">
              함께 묶을 수 있는 다른 주문이 없습니다.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {candidates.map((c) => {
                const items = itemsByOrder[c.id] ?? [];
                const firstTitle = items[0]?.title ?? "";
                const more = items.length > 1 ? ` 외 ${items.length - 1}건` : "";
                const checked = selected.has(c.id);
                return (
                  <li key={c.id}>
                    <label className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-[var(--surface)]">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(c.id)}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-mono opacity-70">
                          {c.order_no ?? c.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-sm font-medium truncate">
                          {firstTitle}
                          {more}
                        </p>
                        <p className="text-[11px] opacity-50 mt-0.5">
                          {formatOrderDate(c.created_at)} · {formatUSD(c.total_usd)}
                        </p>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {error && (
          <p className="px-5 pt-2 text-xs text-red-600">{error}</p>
        )}

        <footer className="px-5 py-3 border-t border-[var(--border)] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-4 py-2 rounded-full border border-[var(--border)]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || candidates.length === 0 || selected.size === 0}
            className="text-xs font-bold px-4 py-2 rounded-full bg-[var(--primary)] text-white disabled:opacity-50"
          >
            {submitting ? "신청 중..." : `통합배송 신청 (${selected.size + 1}건)`}
          </button>
        </footer>
      </div>
    </div>
  );
}
