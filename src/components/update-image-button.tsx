"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UpdateImageButton({ cardId }: { cardId: string }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit() {
    if (!url.includes("snkrdunk.com/apparels/")) {
      setError("snkrdunk 상품 URL을 입력해주세요");
      return;
    }
    setLoading(true);
    setError("");
    const resp = await fetch("/api/cards/update-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, snkrdunkUrl: url }),
    });
    if (resp.ok) {
      setOpen(false);
      setUrl("");
      router.refresh();
    } else {
      const data = await resp.json();
      setError(data.error || "실패");
    }
    setLoading(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-[var(--primary)] hover:underline cursor-pointer"
      >
        이미지 업데이트
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 mt-2">
      <p className="text-xs opacity-60">snkrdunk 상품 URL을 붙여넣으세요</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://snkrdunk.com/apparels/..."
          className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-3 py-2 rounded-lg bg-[var(--primary)] text-white text-xs cursor-pointer disabled:opacity-50"
        >
          {loading ? "..." : "적용"}
        </button>
        <button
          onClick={() => { setOpen(false); setError(""); }}
          className="px-3 py-2 rounded-lg border border-[var(--border)] text-xs cursor-pointer"
        >
          취소
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
