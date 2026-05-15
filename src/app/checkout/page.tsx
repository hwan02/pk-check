"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
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

interface PreviewProfile {
  recipient_name: string | null;
  phone: string | null;
  postal_code: string | null;
  address1: string | null;
  address2: string | null;
  country: string | null;
}

interface ShippingQuote {
  zone: 1 | 2 | 3 | 4;
  zone_label: string;
  country: string;
  weight_g: number;
  shipping_krw: number;
  shipping_usd: number;
  exchange_rate: number;
}

interface Preview {
  items: CartItem[];
  profile: PreviewProfile | null;
  subtotal_usd: number;
  payment_fee_usd: number;
  fee_rates: { payment: number };
  shipping: ShippingQuote;
  total_usd: number;
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
  const [data, setData] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [sdkReady, setSdkReady] = useState(false);
  const [rendered, setRendered] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  useEffect(() => {
    fetch("/api/checkout/preview")
      .then((r) => r.json())
      .then((d: Preview) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  const addressReady =
    !!data?.profile?.postal_code &&
    !!data?.profile?.address1 &&
    !!data?.profile?.country;

  const renderButtons = useCallback(() => {
    if (!window.paypal || rendered || !data?.items.length || !addressReady) return;
    setRendered(true);

    window.paypal.Buttons({
      style: { layout: "vertical", color: "black", shape: "rect", label: "pay", height: 48 },

      createOrder: async () => {
        setPaying(true);
        setError("");
        const resp = await fetch("/api/paypal/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const json = await resp.json();
        if (!resp.ok) {
          setError(json.error || "주문 생성 실패");
          setPaying(false);
          throw new Error(json.error);
        }
        return json.paypalOrderId;
      },

      onApprove: async (approval: { orderID: string }) => {
        const resp = await fetch("/api/paypal/capture-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paypalOrderId: approval.orderID }),
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
  }, [data, rendered, router, addressReady]);

  useEffect(() => {
    if (sdkReady && data?.items.length && !rendered && addressReady) {
      renderButtons();
    }
  }, [sdkReady, data, rendered, renderButtons, addressReady]);

  if (loading) {
    return <div className="max-w-2xl mx-auto px-4 py-16 text-center text-sm opacity-50">로딩 중...</div>;
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="font-semibold mb-2">장바구니가 비어있습니다</p>
      </div>
    );
  }

  const p = data.profile;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold mb-6">결제</h1>

      {/* 배송지 */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold tracking-widest uppercase opacity-60">
            배송지
          </p>
          <Link
            href="/mypage/profile"
            className="text-[11px] underline underline-offset-2 opacity-70 hover:opacity-100"
          >
            변경
          </Link>
        </div>
        {addressReady ? (
          <div className="text-xs leading-relaxed">
            <p className="font-semibold text-sm">{p?.recipient_name || "—"}</p>
            <p className="opacity-80 mt-0.5">
              {p?.postal_code} {p?.address1}
              {p?.address2 ? `, ${p.address2}` : ""}
            </p>
            <p className="opacity-80">{p?.country}</p>
            {p?.phone && <p className="opacity-60 mt-1">{p.phone}</p>}
          </div>
        ) : (
          <p className="text-xs text-red-600">
            배송지가 등록되지 않았습니다. 마이페이지에서 먼저 등록해 주세요.
          </p>
        )}
      </section>

      {/* 주문 요약 */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 mb-4">
        <p className="text-xs font-semibold tracking-widest uppercase opacity-60 mb-3">
          주문 요약
        </p>
        {data.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm py-1.5">
            <span className="line-clamp-1 flex-1 mr-4">
              {item.listing.title} × {item.quantity}
            </span>
            <span className="font-medium flex-shrink-0">
              ${(item.listing.price_usd * item.quantity).toFixed(2)}
            </span>
          </div>
        ))}
        <div className="border-t border-[var(--border)] mt-3 pt-3 space-y-1.5 text-sm">
          <Row label="상품 합계" value={`$${data.subtotal_usd.toFixed(2)}`} />
          <Row label="결제 수수료" value={`$${data.payment_fee_usd.toFixed(2)}`} />
        </div>
        <div className="border-t border-[var(--border-strong)] mt-3 pt-3 flex justify-between text-base font-bold">
          <span>총 결제금액</span>
          <span>${(data.subtotal_usd + data.payment_fee_usd).toFixed(2)}</span>
        </div>

        {/* 배송비 별도 안내 */}
        <div className="mt-4 p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          {data.shipping.domestic ? (
            <>
              <Row label="국내 배송비" value="₩3,000" />
              <p className="text-[10px] opacity-50 mt-2">
                국내 배송비 ₩3,000은 실제 발송 시 추가 정산됩니다.
              </p>
            </>
          ) : (
            <>
              <Row
                label="예상 국제운송료"
                value={`$${data.shipping.shipping_usd.toFixed(2)}`}
                sub={`${data.shipping.zone_label} · ${data.shipping.weight_g}g`}
              />
              <p className="text-[10px] opacity-50 mt-2">
                국제운송료는 상품의 실제 중량 측정 후 추가 정산 시 결제합니다.
              </p>
            </>
          )}
        </div>
      </section>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {paying && (
        <p className="text-sm opacity-60 mb-4 text-center">결제 처리 중...</p>
      )}

      {/* PayPal 버튼 */}
      {addressReady ? (
        <div id="paypal-button-container" className="min-h-[60px]" />
      ) : (
        <Link
          href="/mypage/profile"
          className="block w-full py-3 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold text-center"
        >
          배송지 등록하기
        </Link>
      )}

      {clientId && addressReady && (
        <Script
          src={`https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`}
          onReady={() => setSdkReady(true)}
        />
      )}
    </div>
  );
}

function Row({
  label,
  value,
  sub,
}: {
  label: React.ReactNode;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex justify-between items-start gap-3">
      <span className="opacity-70">{label}</span>
      <div className="text-right">
        <span className="font-medium">{value}</span>
        {sub && <p className="text-[10px] opacity-50">{sub}</p>}
      </div>
    </div>
  );
}
