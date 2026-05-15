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
  const [msg, setMsg] = useState("");

  if (paidOrders.length < 2) return null;

  // 이미 묶인 주문 그룹
  const bundleGroups = new Map<string, Order[]>();
  const unbundled: Order[] = [];
  for (const o of paidOrders) {
    if (o.bundle_group) {
      const arr = bundleGroups.get(o.bundle_group) ?? [];
      arr.push(o);
      bundleGroups.set(o.bundle_group, arr);
    } else {
      unbundled.push(o);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBundle() {
    if (selected.size < 2) { setMsg("2개 이상 선택해주세요"); return; }
    setLoading(true);
    setMsg("");
    const resp = await fetch("/api/orders/bundle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderIds: [...selected] }),
    });
    setLoading(false);
    if (resp.ok) {
      setMsg("묶음 배송이 요청되었습니다!");
      setSelected(new Set());
      router.refresh();
    } else {
      const data = await resp.json().catch(() => ({}));
      setMsg(data.error || "요청 실패");
    }
  }

  async function handleUnbundle(orderId: string) {
    await fetch("/api/orders/bundle", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 mb-6">
      <h2 className="text-sm font-bold mb-1">묶음 배송</h2>
      <p className="text-[11px] opacity-60 mb-4">
        발송 전 주문을 묶으면 배송비를 절약할 수 있습니다. 묶을 주문을 선택해주세요.
      </p>

      {/* 이미 묶인 그룹 */}
      {[...bundleGroups.entries()].map(([group, orders]) => (
        <div key={group} className="mb-3 p-3 rounded-lg bg-green-50 border border-green-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-green-700">
              묶음 #{group.slice(-6)} ({orders.length}건)
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {orders.map((o) => (
              <div key={o.id} className="flex items-center gap-1 text-[11px] bg-white rounded px-2 py-1 border border-green-200">
                <span>{o.order_no ?? o.id.slice(0, 8).toUpperCase()}</span>
                <button
                  onClick={() => handleUnbundle(o.id)}
                  className="text-red-400 hover:text-red-600 cursor-pointer ml-1"
                  title="묶음 해제"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* 묶이지 않은 주문 선택 */}
      {unbundled.length >= 2 && (
        <>
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
            className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold disabled:opacity-40 cursor-pointer"
          >
            {loading ? "처리 중..." : `선택한 ${selected.size}건 묶음 배송 요청`}
          </button>
        </>
      )}

      {msg && <p className="text-xs mt-2 opacity-70">{msg}</p>}
    </div>
  );
}
