"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AddToCartButton({
  listingId,
  disabled,
  loggedIn,
  isDemo = false,
}: {
  listingId: string;
  disabled: boolean;
  loggedIn: boolean;
  isDemo?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [msg, setMsg] = useState("");

  if (!loggedIn) {
    return (
      <button
        onClick={() => router.push(`/login?next=/shop/${listingId}`)}
        className="w-full py-3 rounded-xl bg-[var(--primary)] text-white font-medium hover:opacity-90 cursor-pointer"
      >
        로그인하고 구매하기
      </button>
    );
  }

  // UUID 형식이면 실제 listing, 아니면 데모(cardId) → ensure 필요
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(listingId);

  async function ensureListing(): Promise<string | null> {
    if (isUuid) return listingId;
    // cardId → listings에 자동 생성
    const resp = await fetch("/api/listings/ensure", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cardId: listingId }),
    });
    if (resp.ok) {
      const data = await resp.json();
      return data.listingId;
    }
    return null;
  }

  async function addToCart() {
    setLoading(true);
    setMsg("");
    const realId = await ensureListing();
    if (!realId) { setMsg("상품 준비 실패"); setLoading(false); return; }

    const resp = await fetch("/api/cart", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ listing_id: realId, quantity: 1 }),
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

  async function buyNow() {
    setBuyLoading(true);
    setMsg("");
    const realId = await ensureListing();
    if (!realId) { setMsg("상품 준비 실패"); setBuyLoading(false); return; }

    const resp = await fetch("/api/cart", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ listing_id: realId, quantity: 1 }),
    });
    setBuyLoading(false);
    if (resp.ok) {
      router.push("/checkout");
    } else {
      const json = await resp.json().catch(() => ({}));
      setMsg(json.error ?? "담기 실패");
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={buyNow}
        disabled={disabled || buyLoading}
        className="w-full py-3 rounded-xl bg-[var(--accent)] text-white font-bold hover:opacity-90 disabled:opacity-50 cursor-pointer"
      >
        {disabled ? "품절" : buyLoading ? "처리 중..." : "즉시 구매"}
      </button>
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
