"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PriceInline({ id, initial }: { id: string; initial: number }) {
  const router = useRouter();
  const [value, setValue] = useState(String(initial));
  const [saving, setSaving] = useState(false);

  async function save() {
    const n = parseInt(value, 10);
    if (!Number.isInteger(n) || n < 0) return;
    if (n === initial) return;
    setSaving(true);
    const resp = await fetch(`/api/admin/market/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ price_krw: n }),
    });
    setSaving(false);
    if (resp.ok) router.refresh();
    else alert("저장 실패");
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ""))}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        className="w-24 px-2 py-1 text-xs text-right rounded border border-[var(--border)] bg-[var(--background)]"
      />
      <span className="text-xs opacity-50">원</span>
      {saving && <span className="text-[10px] opacity-50">저장 중</span>}
    </div>
  );
}

export function DeleteMarketButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function onDelete() {
    if (!confirm("삭제할까요?")) return;
    setLoading(true);
    const resp = await fetch(`/api/admin/market/${id}`, { method: "DELETE" });
    setLoading(false);
    if (resp.ok) router.refresh();
    else alert("삭제 실패");
  }
  return (
    <button
      onClick={onDelete}
      disabled={loading}
      className="text-xs px-2 py-1 rounded border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      {loading ? "..." : "삭제"}
    </button>
  );
}

export function ToggleActiveButton({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function toggle() {
    setLoading(true);
    const resp = await fetch(`/api/admin/market/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ is_active: !active }),
    });
    setLoading(false);
    if (resp.ok) router.refresh();
  }
  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-[10px] px-2 py-1 rounded ${active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}
    >
      {active ? "노출중" : "숨김"}
    </button>
  );
}
