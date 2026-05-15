"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

export default function AddToCartButton({
  listingId,
  disabled,
  loggedIn,
  wishlistSlot,
}: {
  listingId: string;
  disabled: boolean;
  loggedIn: boolean;
  wishlistSlot?: ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [msg, setMsg] = useState("");

  if (!loggedIn) {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          {wishlistSlot && <div className="shrink-0">{wishlistSlot}</div>}
          <button
            onClick={() => router.push(`/login?redirect=/shop/${listingId}`)}
            className="flex-1 py-3 rounded-xl bg-[var(--primary)] text-white font-medium hover:opacity-90 cursor-pointer"
          >
            로그인하고 구매하기
          </button>
        </div>
      </div>
    );
  }

  async function addToCart() {
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

  function buyNow() {
    // 장바구니를 건드리지 않고 쿼리 파라미터로 단일 상품 결제 흐름 진입
    setBuyLoading(true);
    router.push(`/checkout?buy=${encodeURIComponent(listingId)}&qty=1`);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {wishlistSlot && <div className="shrink-0">{wishlistSlot}</div>}
        <button
          onClick={buyNow}
          disabled={disabled || buyLoading}
          className="flex-1 py-3 rounded-xl bg-[var(--accent)] text-white font-bold hover:opacity-90 disabled:opacity-50 cursor-pointer"
        >
          {disabled ? "품절" : buyLoading ? "이동 중..." : "즉시 구매"}
        </button>
      </div>
      <button
        onClick={addToCart}
        disabled={disabled || loading}
        className="w-full py-3 rounded-xl border border-[var(--border)] font-medium hover:bg-[var(--surface)] disabled:opacity-50 cursor-pointer"
      >
        {loading ? "담는 중..." : "장바구니 담기"}
      </button>
      {msg && <p className="text-xs opacity-70 mt-2 text-center">{msg}</p>}
    </div>
  );
}
