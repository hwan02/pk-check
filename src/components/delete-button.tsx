"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteButton({ cardId }: { cardId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleDelete() {
    setError("");
    const resp = await fetch("/api/snkrdunk/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, password }),
    });
    if (resp.ok) {
      router.push("/");
    } else {
      const data = await resp.json();
      setError(data.error || "삭제 실패");
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="px-4 py-2 rounded-lg border border-red-400 text-red-500 text-sm hover:bg-red-50 transition cursor-pointer"
      >
        삭제
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="비밀번호"
        className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-sm w-28 focus:outline-none focus:ring-2 focus:ring-red-400"
      />
      <button
        onClick={handleDelete}
        className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm cursor-pointer"
      >
        확인
      </button>
      <button
        onClick={() => { setConfirming(false); setError(""); }}
        className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm cursor-pointer"
      >
        취소
      </button>
      {error && <span className="text-sm text-red-500">{error}</span>}
    </div>
  );
}
