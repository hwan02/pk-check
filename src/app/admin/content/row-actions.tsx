"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PublishToggle({ id, published }: { id: number; published: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function toggle() {
    setLoading(true);
    const resp = await fetch(`/api/admin/articles/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ is_published: !published }),
    });
    setLoading(false);
    if (resp.ok) router.refresh();
  }
  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-[10px] px-2 py-1 rounded ${published ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}
    >
      {published ? "공개" : "비공개"}
    </button>
  );
}

export function DeleteArticleButton({ id }: { id: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function onDelete() {
    if (!confirm("이 글을 삭제할까요?")) return;
    setLoading(true);
    const resp = await fetch(`/api/admin/articles/${id}`, { method: "DELETE" });
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
