"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

interface OrderItem {
  id: string;
  title: string;
  title_en: string | null;
  image_url: string | null;
  price_usd: number;
  quantity: number;
}

interface Order {
  id: string;
  status: string;
  total_usd: number;
  paid_at: string | null;
  created_at: string;
  order_items: OrderItem[];
}

const STATUS_LABEL: Record<string, string> = {
  paid: "결제 완료",
  shipped: "배송 중",
  delivered: "배송 완료",
  cancelled: "취소됨",
  refunded: "환불됨",
};

export default function OrdersPage() {
  return (
    <Suspense>
      <OrdersContent />
    </Suspense>
  );
}

function OrdersContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-sm opacity-50">로딩 중...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {success && (
        <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm text-center">
          결제가 완료되었습니다! 감사합니다.
        </div>
      )}

      <h1 className="text-xl font-bold mb-6">내 주문</h1>

      {!orders.length && (
        <p className="text-center py-16 opacity-50">주문 내역이 없습니다.</p>
      )}

      <div className="flex flex-col gap-4">
        {orders.map((order) => (
          <div key={order.id} className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 bg-[var(--surface)] border-b border-[var(--border)]">
              <div className="text-xs">
                <span className="opacity-50">주문일</span>{" "}
                <span className="font-medium">{new Date(order.created_at).toLocaleDateString("ko-KR")}</span>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                order.status === "paid" ? "bg-green-100 text-green-700" :
                order.status === "shipped" ? "bg-blue-100 text-blue-700" :
                order.status === "delivered" ? "bg-gray-100 text-gray-700" :
                "bg-red-100 text-red-700"
              }`}>
                {STATUS_LABEL[order.status] ?? order.status}
              </span>
            </div>

            {/* 아이템 */}
            <div className="p-4">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-2">
                  {item.image_url && (
                    <Image
                      src={item.image_url}
                      alt={item.title}
                      width={48}
                      height={48}
                      className="rounded object-cover flex-shrink-0"
                      unoptimized
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-1">{item.title}</p>
                    <p className="text-xs opacity-50">× {item.quantity}</p>
                  </div>
                  <p className="text-sm font-medium flex-shrink-0">
                    ${(item.price_usd * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
              <hr className="my-2 border-[var(--border)]" />
              <div className="flex justify-between text-sm font-bold">
                <span>합계</span>
                <span>${order.total_usd.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
