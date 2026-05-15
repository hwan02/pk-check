import type { Order, OrderItem } from "@/lib/shop";

// DB에 주문이 아직 없을 때 보여줄 데모 주문 (해외 구매자 시나리오)
export function getDemoOrders(): { order: Order; items: OrderItem[] }[] {
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - 4);

  const o1: Order = {
    id: "demo-order-0001",
    order_no: "PK-20260511-A1F3C2",
    user_id: null,
    status: "shipped",
    subtotal_usd: 248.0,
    shipping_usd: 18.5,
    total_usd: 281.41,
    agent_fee_usd: 7.44,
    payment_fee_usd: 7.47,
    exchange_rate: 1378.5,
    estimated_weight_g: 320,
    payment_method: "card",
    card_brand: "VISA",
    card_last4: "4242",
    shipping_country: "JP",
    shipping_address: {
      name: "Hiroshi Tanaka",
      line1: "2-1-3 Shinjuku",
      line2: "Apt 502",
      city: "Shinjuku-ku",
      state: "Tokyo",
      postal_code: "160-0022",
      country: "Japan",
      phone: "+81 90-1234-5678",
    },
    tracking_carrier: "EMS",
    tracking_no: "EE123456789KR",
    tracking_url: "https://trace.epost.go.kr/xtts/tt/epost/ems/ems_eng.jsp?POST_CODE=EE123456789KR",
    shipped_at: new Date(baseDate.getTime() + 86400000).toISOString(),
    delivered_at: null,
    customs_status: "in_review",
    customs_cleared_at: null,
    paid_at: baseDate.toISOString(),
    created_at: baseDate.toISOString(),
  };

  const items1: OrderItem[] = [
    {
      id: "demo-item-1",
      order_id: o1.id,
      listing_id: null,
      title: "포켓몬 카드 SAR 리자몽 ex",
      title_en: "Pokémon Card SAR Charizard ex",
      image_url: "https://images.pokemontcg.io/sv3pt5/199_hires.png",
      price_usd: 189.0,
      quantity: 1,
    },
    {
      id: "demo-item-2",
      order_id: o1.id,
      listing_id: null,
      title: "포켓몬 카드 AR 피카츄",
      title_en: "Pokémon Card AR Pikachu",
      image_url: "https://images.pokemontcg.io/sv4pt5/238_hires.png",
      price_usd: 29.5,
      quantity: 2,
    },
  ];

  return [{ order: o1, items: items1 }];
}

export function getDemoOrderById(id: string) {
  return getDemoOrders().find((x) => x.order.id === id || x.order.order_no === id);
}
