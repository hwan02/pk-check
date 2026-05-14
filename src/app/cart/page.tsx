"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface CartItem {
  id: string;
  quantity: number;
  listing: {
    id: string;
    title: string;
    price_usd: number;
    image_url: string | null;
    stock: number;
  };
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchCart() {
    const resp = await fetch("/api/cart");
    if (resp.ok) {
      const data = await resp.json();
      setItems(data.items ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { fetchCart(); }, []);

  async function removeItem(itemId: string) {
    await fetch("/api/cart", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cartItemId: itemId }),
    });
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }

  const subtotal = items.reduce((s, i) => s + i.listing.price_usd * i.quantity, 0);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="opacity-50 text-sm">로딩 중...</p>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-lg font-semibold mb-2">장바구니가 비어있습니다</p>
        <Link href="/shop" className="text-sm opacity-60 hover:underline">쇼핑하러 가기 →</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold mb-6">장바구니</h1>

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--card-bg)]">
            {item.listing.image_url && (
              <Image
                src={item.listing.image_url}
                alt={item.listing.title}
                width={64}
                height={64}
                className="rounded-lg object-cover flex-shrink-0"
                unoptimized
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium line-clamp-1">{item.listing.title}</p>
              <p className="text-xs opacity-50 mt-0.5">수량 {item.quantity}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold">${(item.listing.price_usd * item.quantity).toFixed(2)}</p>
              <button
                onClick={() => removeItem(item.id)}
                className="text-[10px] text-[var(--muted)] hover:text-[var(--accent)] mt-1 cursor-pointer"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 합계 */}
      <div className="mt-6 p-4 rounded-xl border border-[var(--border)] bg-[var(--card-bg)]">
        <div className="flex justify-between text-sm">
          <span className="opacity-60">소계</span>
          <span className="font-bold">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="opacity-60">배송비</span>
          <span className="font-bold">무료</span>
        </div>
        <hr className="my-3 border-[var(--border)]" />
        <div className="flex justify-between text-base">
          <span className="font-bold">총 결제금액</span>
          <span className="font-black">${subtotal.toFixed(2)}</span>
        </div>
      </div>

      <Link
        href="/checkout"
        className="block mt-4 w-full py-3.5 rounded-xl bg-[var(--primary)] text-white text-center text-sm font-semibold hover:opacity-90 transition"
      >
        결제하기
      </Link>
    </div>
  );
}
