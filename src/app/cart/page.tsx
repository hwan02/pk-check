"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import RecentlyViewed from "@/components/recently-viewed";

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
  const router = useRouter();
  const [data, setData] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeight, setSelectedWeight] = useState("auto");
  const [customShipping, setCustomShipping] = useState<number | null>(null);

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
    fetchCart();
    router.refresh();
  }

  async function updateQty(itemId: string, qty: number) {
    if (qty < 1) return;
    await fetch("/api/cart/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cartItemId: itemId, quantity: qty }),
    });
    fetchCart();
    router.refresh();
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
  const bundleSaving: number = (data as unknown as { bundle_saving_usd?: number })?.bundle_saving_usd ?? 0;
  const paymentFee = data?.payment_fee_usd ?? 0;
  const total = data?.total_usd ?? 0;
  const isDomestic = !!(data?.shipping as { domestic?: boolean })?.domestic;
  const zoneLabel = data?.shipping?.zone_label ?? "";
  const p = data?.profile as { country?: string | null; postal_code?: string | null; address1?: string | null } | null;
  const hasAddress = !!p?.country && !!p?.postal_code && !!p?.address1;

  const WEIGHT_OPTIONS = [
    { value: "500", label: "0.5 kg" },
    { value: "1000", label: "1 kg" },
    { value: "1500", label: "1.5 kg" },
    { value: "2000", label: "2 kg" },
    { value: "2500", label: "2.5 kg" },
    { value: "3000", label: "3 kg" },
    { value: "3500", label: "3.5 kg" },
    { value: "4000", label: "4 kg" },
    { value: "4500", label: "4.5 kg" },
    { value: "5000", label: "5 kg" },
    { value: "5500", label: "5.5 kg" },
  ];

  async function onWeightChange(val: string) {
    setSelectedWeight(val);
    if (val === "auto") {
      setCustomShipping(null);
      return;
    }
    // 선택 중량으로 배송비 재계산
    const resp = await fetch(`/api/checkout/preview?weight=${val}`);
    if (resp.ok) {
      const d = await resp.json();
      setCustomShipping(d.shipping?.shipping_usd ?? null);
    }
  }

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
              <div className="flex items-center gap-2 mt-1.5">
                <button
                  onClick={() => updateQty(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                  className="w-6 h-6 rounded border border-[var(--border)] text-xs flex items-center justify-center disabled:opacity-30 cursor-pointer"
                >
                  −
                </button>
                <span className="text-xs font-medium w-5 text-center">{item.quantity}</span>
                <button
                  onClick={() => updateQty(item.id, item.quantity + 1)}
                  className="w-6 h-6 rounded border border-[var(--border)] text-xs flex items-center justify-center cursor-pointer"
                >
                  +
                </button>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-[10px] text-[var(--muted)] hover:text-[var(--accent)] ml-2 cursor-pointer"
                >
                  삭제
                </button>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold">${(item.listing.price_usd * item.quantity).toFixed(2)}</p>
              <p className="text-[10px] opacity-40">${item.listing.price_usd.toFixed(2)} × {item.quantity}</p>
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
          <span className="opacity-60">결제 수수료</span>
          <span className="font-bold">${paymentFee.toFixed(2)}</span>
        </div>

        <hr className="my-3 border-[var(--border)]" />
        <div className="flex justify-between text-base">
          <span className="font-bold">총 결제 금액</span>
          <span className="font-black">${(subtotal + paymentFee).toFixed(2)}</span>
        </div>

        {/* 배송비 안내 */}
        {hasAddress ? (
          <div className="mt-4 p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
            {isDomestic ? (
              <>
                <div className="flex justify-between text-xs">
                  <span className="opacity-60">국내 배송비</span>
                  <span className="font-bold">₩3,000</span>
                </div>
                <p className="text-[10px] opacity-50 mt-2 leading-relaxed border-t border-[var(--border)] pt-2">
                  국내 배송비 ₩3,000은 실제 발송 시 추가 정산됩니다.
                </p>
              </>
            ) : (
              <>
                <div className="mb-3">
                  <label className="text-[11px] font-semibold opacity-60 block mb-1">
                    예상 중량 선택
                  </label>
                  <select
                    value={selectedWeight}
                    onChange={(e) => onWeightChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--card-bg)]"
                  >
                    <option value="auto">선택해주세요</option>
                    {WEIGHT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {selectedWeight !== "auto" && (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="opacity-60">예상 중량</span>
                      <span className="font-bold">{(Number(selectedWeight) / 1000).toFixed(1)} kg</span>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="opacity-60">
                        예상 국제운송료
                        <span className="opacity-50 ml-1">({zoneLabel})</span>
                      </span>
                      <span className="font-bold">${(customShipping ?? shippingUsd).toFixed(2)}</span>
                    </div>
                  </>
                )}

                {bundleSaving > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs">
                    <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-bold text-[10px]">묶음 배송</span>
                    <span className="text-green-700 font-medium">
                      개별 발송 대비 ${bundleSaving.toFixed(2)} 절약!
                    </span>
                  </div>
                )}

                <p className="text-[10px] opacity-50 mt-2 leading-relaxed border-t border-[var(--border)] pt-2">
                  국제운송료는 상품의 실제 중량 측정 후 추가 정산 시 결제합니다.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="mt-4 p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
            <p className="text-xs opacity-50">배송지 등록 후 예상 운송료를 확인할 수 있습니다.</p>
          </div>
        )}
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

      <RecentlyViewed />
    </div>
  );
}
