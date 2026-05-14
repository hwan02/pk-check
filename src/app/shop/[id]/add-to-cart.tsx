"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AddToCartButton({
  listingId,
  disabled,
  loggedIn,
}: {
  listingId: string;
  disabled: boolean;
  loggedIn: boolean;
  isDemo?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  if (!loggedIn) {
    return (
      <button
        onClick={() => router.push(`/login?next=/shop/${listingId}`)}
        className="w-full py-3 rounded-xl bg-[var(--primary)] text-white font-medium hover:opacity-90 cursor-pointer"
      >
        로그인하고 장바구니 담기
      </button>
    );
  }

  async function add() {
    setLoading(true);
    setMsg("");
    const resp = await fetch("/api/cart", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ listing_id: listingId, quantity: 1 }),
    });
    setLoading(false);
    if (resp.ok) {
      setMsg("장바구니에 담았습니다!");
      router.refresh();
    } else {
      const json = await resp.json().catch(() => ({}));
      setMsg(json.error ?? "담기 실패");
    }
  }

  return (
    <div>
      <button
        onClick={add}
        disabled={disabled || loading}
        className="w-full py-3 rounded-xl bg-[var(--primary)] text-white font-medium hover:opacity-90 disabled:opacity-50 cursor-pointer"
      >
        {disabled ? "품절" : loading ? "담는 중..." : "장바구니 담기"}
      </button>
      {msg && <p className="text-xs opacity-70 mt-2 text-center">{msg}</p>}
    </div>
  );
}
