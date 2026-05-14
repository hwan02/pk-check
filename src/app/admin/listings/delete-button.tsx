"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteListingButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    if (!confirm("이 상품을 삭제할까요?")) return;
    setLoading(true);
    const resp = await fetch(`/api/admin/listings/${id}`, { method: "DELETE" });
    setLoading(false);
    if (resp.ok) {
      router.refresh();
    } else {
      const json = await resp.json().catch(() => ({}));
      alert(json.error ?? "삭제 실패");
    }
  }

  return (
    <button
      onClick={onDelete}
      disabled={loading}
      className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {loading ? "..." : "삭제"}
    </button>
  );
}