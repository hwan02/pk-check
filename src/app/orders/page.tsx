export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createSsrClient } from "@/lib/supabase/ssr";
import type { Order, OrderItem } from "@/lib/shop";
import OrdersList from "./orders-list";

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function OrdersPage({ searchParams }: Props) {
  const params = await searchParams;
  const success = params.success === "1";

  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/orders");

  const { data: ordersData } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", user.id)
    .neq("status", "pending")
    .order("created_at", { ascending: false });

  const orders = (ordersData ?? []) as Order[];

  const itemsByOrder: Record<string, OrderItem[]> = {};
  if (orders.length > 0) {
    const ids = orders.map((o) => o.id);
    const { data: itemRows } = await supabase
      .from("order_items")
      .select("*")
      .in("order_id", ids);
    for (const it of (itemRows ?? []) as OrderItem[]) {
      (itemsByOrder[it.order_id] ||= []).push(it);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">주문/배송조회</h1>
        <p className="text-xs opacity-60 mt-1">
          Order &amp; Shipping Tracking
        </p>
      </header>

      {success && (
        <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm text-center">
          결제가 완료되었습니다! 감사합니다.
        </div>
      )}

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-12 text-center">
          <p className="text-sm opacity-60">아직 주문 내역이 없습니다.</p>
          <Link
            href="/shop"
            className="inline-block mt-4 px-4 py-2 rounded-full bg-[var(--primary)] text-white text-xs font-semibold"
          >
            쇼핑 시작
          </Link>
        </div>
      ) : (
        <OrdersList orders={orders} itemsByOrder={itemsByOrder} />
      )}
    </div>
  );
}
