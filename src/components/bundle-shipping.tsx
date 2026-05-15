"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Order {
  id: string;
  order_no?: string;
  bundle_group?: string | null;
}

export default function BundleShipping({ paidOrders }: { paidOrders: Order[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  if (paidOrders.length < 2) return null;

  const bundled = paidOrders.filter((o) => o.bundle_group);
  const unbundled = paidOrders.filter((o) => !o.bundle_group);
  const bundleGroupId = bundled[0]?.bundle_group;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBundle() {
    if (selected.size < 2) return;
    setLoading(true);
    const resp = await fetch("/api/orders/bundle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderIds: [...selected] }),
    });
    setLoading(false);
    if (resp.ok) {
      setSelected(new Set());
      router.refresh();
    }
  }

  async function handleUnbundleAll() {
    setLoading(true);
    for (const o of bundled) {
      await fetch("/api/orders/bundle", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: o.id }),
      });
    }
    setLoading(false);
    router.refresh();
  }

  // 모두 묶여있는 경우: 해제 버튼만
  if (bundled.length === paidOrders.length && bundleGroupId) {
    return (
      <button
        onClick={handleUnbundleAll}
        disabled={loading}
        className="mb-4 w-full py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 text-xs font-semibold disabled:opacity-50 cursor-pointer"
      >
        {loading ? "해제 중..." : `통합해제 (${bundleGroupId.slice(-8)})`}
      </button>
    );
  }

  // 일부만 묶이거나, 아직 안 묶인 경우
  return (
    <div className="mb-4">
      {/* 이미 묶인 그룹 */}
      {bundleGroupId && bundled.length > 0 && (
        <button
          onClick={handleUnbundleAll}
          disabled={loading}
          className="mb-2 w-full py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 text-xs font-semibold disabled:opacity-50 cursor-pointer"
        >
          {loading ? "해제 중..." : `통합해제 (${bundleGroupId.slice(-8)}) · ${bundled.length}건`}
        </button>
      )}

      {/* 묶이지 않은 주문 선택 */}
      {unbundled.length >= 2 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4">
          <p className="text-[11px] opacity-60 mb-3">
            발송 전 주문을 묶으면 배송비를 절약할 수 있습니다.
          </p>
          <div className="flex flex-col gap-1.5 mb-3">
            {unbundled.map((o) => (
              <label key={o.id} className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={selected.has(o.id)}
                  onChange={() => toggle(o.id)}
                  className="accent-[var(--primary)]"
                />
                <span className="font-mono">{o.order_no ?? o.id.slice(0, 8).toUpperCase()}</span>
              </label>
            ))}
          </div>
          <button
            onClick={handleBundle}
            disabled={selected.size < 2 || loading}
            className="w-full py-2.5 rounded-xl bg-[var(--primary)] text-white text-xs font-semibold disabled:opacity-40 cursor-pointer"
          >
            {loading ? "처리 중..." : `통합배송 신청 (${selected.size}건)`}
          </button>
        </div>
      )}
    </div>
  );
}
