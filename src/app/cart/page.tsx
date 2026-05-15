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

interface Preview {
  items: CartItem[];
  subtotal_usd: number;
  payment_fee_usd: number;
  fee_rates: { payment: number };
  shipping: {
    zone_label: string;
    country: string;
    weight_g: number;
    shipping_usd: number;
    shipping_krw: number;
  };
  total_usd: number;
  profile: { country: string | null } | null;
}

export default function CartPage() {
  const [data, setData] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchCart() {
    const resp = await fetch("/api/checkout/preview");
    if (resp.ok) {
      const d = await resp.json();
      setData(d);
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
    // 다시 불러오기
    fetchCart();
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="opacity-50 text-sm">로딩 중...</p>
      </div>
    );
  }

  const items = (data?.items ?? []) as CartItem[];

  if (!items.length) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-lg font-semibold mb-2">장바구니가 비어있습니다</p>
        <Link href="/shop" className="text-sm opacity-60 hover:underline">쇼핑하러 가기 →</Link>
      </div>
    );
  }

  const subtotal = data?.subtotal_usd ?? 0;
  const shippingUsd = data?.shipping?.shipping_usd ?? 0;
  const paymentFee = data?.payment_fee_usd ?? 0;
  const total = data?.total_usd ?? 0;
  const feeRate = data?.fee_rates?.payment ?? 0;
  const hasAddress = !!data?.profile?.country;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold mb-6">장바구니</h1>

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border border-[var(--border)] bg-[var(--card-bg)]">
            {item.listing.image_url && (
              <Image
                src={item.listing.image_url}
                alt={item.listing.title}
                width={56}
                height={56}
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
          <span className="opacity-60">상품 합계</span>
          <span className="font-bold">${subtotal.toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-sm mt-1.5">
          <span className="opacity-60">
            결제 수수료
            <span className="text-[11px] opacity-50 ml-1">
              (PayPal {(feeRate * 100).toFixed(1)}% + $0.30)
            </span>
          </span>
          <span className="font-bold">${paymentFee.toFixed(2)}</span>
        </div>

        <hr className="my-3 border-[var(--border)]" />
        <div className="flex justify-between text-base">
          <span className="font-bold">결제 금액 (상품+수수료)</span>
          <span className="font-black">${(subtotal + paymentFee).toFixed(2)}</span>
        </div>

        {/* 예상 배송비 안내 */}
        <div className="mt-4 p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-xs font-semibold mb-1">배송비 안내</p>
          {hasAddress ? (
            <>
              <div className="flex justify-between text-xs">
                <span className="opacity-60">
                  예상 배송비
                  <span className="opacity-50 ml-1">
                    (K-Packet · {data?.shipping?.weight_g ?? 0}g · {data?.shipping?.zone_label ?? ""})
                  </span>
                </span>
                <span className="font-bold">${shippingUsd.toFixed(2)}</span>
              </div>
              <p className="text-[10px] opacity-50 mt-1.5 leading-relaxed">
                배송비는 실제 포장 후 중량 측정하여 확정됩니다.<br />
                확정된 배송비는 이메일로 안내드리며, 추가 결제 후 발송됩니다.
              </p>
            </>
          ) : (
            <p className="text-xs opacity-50">배송지 등록 후 예상 배송비를 확인할 수 있습니다.</p>
          )}
        </div>
      </div>

      {hasAddress ? (
        <Link
          href="/checkout"
          className="block mt-4 w-full py-3.5 rounded-xl bg-[var(--primary)] text-white text-center text-sm font-semibold hover:opacity-90 transition"
        >
          결제하기
        </Link>
      ) : (
        <Link
          href="/mypage/profile"
          className="block mt-4 w-full py-3.5 rounded-xl bg-[var(--accent)] text-white text-center text-sm font-semibold hover:opacity-90 transition"
        >
          배송지 등록하기
        </Link>
      )}
    </div>
  );
}
