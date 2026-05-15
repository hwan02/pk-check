import { NextRequest, NextResponse } from "next/server";
import { createSsrClient } from "@/lib/supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const ssr = await createSsrClient();
  const { data: { user } } = await ssr.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { orderIds } = await request.json();
  if (!Array.isArray(orderIds) || orderIds.length < 2) {
    return NextResponse.json({ error: "2개 이상의 주문을 선택해주세요" }, { status: 400 });
  }

  const db = createServerClient();

  // 선택한 주문이 모두 본인 것이고, paid 상태(발송 전)인지 확인
  const { data: orders } = await db
    .from("orders")
    .select("id, status, user_id, bundle_group")
    .in("id", orderIds)
    .eq("user_id", user.id);

  if (!orders || orders.length !== orderIds.length) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다" }, { status: 404 });
  }

  const invalidOrders = orders.filter((o) => o.status !== "paid");
  if (invalidOrders.length > 0) {
    return NextResponse.json({ error: "발송 전(결제 완료) 상태의 주문만 묶을 수 있습니다" }, { status: 400 });
  }

  const alreadyBundled = orders.filter((o) => o.bundle_group);
  if (alreadyBundled.length > 0) {
    return NextResponse.json({ error: "이미 묶음 배송이 요청된 주문이 포함되어 있습니다" }, { status: 400 });
  }

  // 묶음 그룹 ID 생성
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 8);
  const bundleGroup = `BDL-${dateStr}-${rand}`;

  // 주문들에 bundle_group 설정
  const { error } = await db
    .from("orders")
    .update({ bundle_group: bundleGroup })
    .in("id", orderIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, bundleGroup, orderCount: orderIds.length });
}

// 묶음 해제
export async function DELETE(request: NextRequest) {
  const ssr = await createSsrClient();
  const { data: { user } } = await ssr.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { orderId } = await request.json();
  if (!orderId) return NextResponse.json({ error: "orderId 필요" }, { status: 400 });

  const db = createServerClient();

  const { data: order } = await db
    .from("orders")
    .select("id, status, user_id")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .single();

  if (!order) return NextResponse.json({ error: "주문 없음" }, { status: 404 });
  if (order.status !== "paid") {
    return NextResponse.json({ error: "발송 전 주문만 해제 가능" }, { status: 400 });
  }

  await db
    .from("orders")
    .update({ bundle_group: null })
    .eq("id", orderId);

  return NextResponse.json({ ok: true });
}
