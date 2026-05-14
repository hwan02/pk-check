"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";

interface CartItem {
  id: string;
  quantity: number;
  listing: {
    id: string;
    title: string;
    price_usd: number;
    image_url: string | null;
  };
}

declare global {
  interface Window {
    paypal?: {
      Buttons: (opts: Record<string, unknown>) => { render: (el: string) => void };
    };
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [sdkReady, setSdkReady] = useState(false);
  const [rendered, setRendered] = useState(false);

  const subtotal = items.reduce((s, i) => s + i.listing.price_usd * i.quantity, 0);
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  useEffect(() => {
    fetch("/api/cart")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  const renderButtons = useCallback(() => {
    if (!window.paypal || rendered || !items.length) return;
    setRendered(true);

    window.paypal.Buttons({
      style: { layout: "vertical", color: "black", shape: "rect", label: "pay", height: 48 },

      createOrder: async () => {
        setPaying(true);
        setError("");
        const resp = await fetch("/api/paypal/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shippingAddress: null }),
        });
        const data = await resp.json();
        if (!resp.ok) {
          setError(data.error || "주문 생성 실패");
          setPaying(false);
          throw new Error(data.error);
        }
        return data.paypalOrderId;
      },

      onApprove: async (data: { orderID: string }) => {
        const resp = await fetch("/api/paypal/capture-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paypalOrderId: data.orderID,
            orderId: undefined, // 서버에서 paypalOrderId로 매칭
          }),
        });
        const result = await resp.json();
        setPaying(false);
        if (resp.ok) {
          router.push(`/orders?success=1`);
        } else {
          setError(result.error || "결제 실패");
        }
      },

      onError: () => {
        setPaying(false);
        setError("PayPal 결제 중 오류가 발생했습니다");
      },

      onCancel: () => {
        setPaying(false);
      },
    }).render("#paypal-button-container");
  }, [items, rendered, router]);

  useEffect(() => {
    if (sdkReady && items.length && !rendered) {
      renderButtons();
    }
  }, [sdkReady, items, rendered, renderButtons]);

  if (loading) {
    return <div className="max-w-2xl mx-auto px-4 py-16 text-center text-sm opacity-50">로딩 중...</div>;
  }

  if (!items.length) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="font-semibold mb-2">장바구니가 비어있습니다</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold mb-6">결제</h1>

      {/* 주문 요약 */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 mb-6">
        <p className="text-xs opacity-50 mb-3">주문 요약</p>
        {items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm py-1.5">
            <span className="line-clamp-1 flex-1 mr-4">{item.listing.title} × {item.quantity}</span>
            <span className="font-medium flex-shrink-0">${(item.listing.price_usd * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        <hr className="my-3 border-[var(--border)]" />
        <div className="flex justify-between text-base font-bold">
          <span>합계</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
      </div>

      {error && (
        <p className="text-sm text-[var(--sell)] mb-4">{error}</p>
      )}

      {paying && (
        <p className="text-sm opacity-60 mb-4 text-center">결제 처리 중...</p>
      )}

      {/* PayPal 버튼 */}
      <div id="paypal-button-container" className="min-h-[60px]" />

      {clientId && (
        <Script
          src={`https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`}
          onReady={() => setSdkReady(true)}
        />
      )}
    </div>
  );
}
