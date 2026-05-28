export interface Listing {
  id: string;
  short_id: string | null;
  title: string;
  title_en: string | null;
  category: "pokemon" | "onepiece";
  language: string | null;
  condition: string | null;
  price_usd: number;
  stock: number;
  description: string | null;
  description_en: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  video_url: string | null;
  grading_company: string | null;
  grading_grade: string | null;
  is_active: boolean;
  card_id: string | null;
  created_at: string;
  updated_at: string;
}

export const CATEGORY_LABEL: Record<Listing["category"], string> = {
  pokemon: "포켓몬",
  onepiece: "원피스",
};

export const CONDITION_LABEL: Record<string, string> = {
  mint: "M (Mint)",
  "near-mint": "NM (Near Mint)",
  excellent: "EX (Excellent)",
  good: "GD (Good)",
  played: "PL (Played)",
};

export const LANGUAGE_LABEL: Record<string, string> = {
  jp: "일본판",
  en: "북미판",
  kr: "한국판",
};

export const GRADING_COMPANY_LABEL: Record<string, string> = {
  brg: "BRG",
  psa: "PSA",
  bgs: "BGS",
  cgc: "CGC",
  sgc: "SGC",
  ace: "ACE",
};

export const GRADING_GRADES = ["10", "9.5", "9", "8.5", "8", "7.5", "7", "6", "5", "4", "3", "2", "1"];

export function formatUSD(n: number): string {
  return `$${n.toFixed(2)}`;
}

// -----------------------------------------------------------
// Orders (해외 구매자 주문 / 배송조회)
// -----------------------------------------------------------
export type OrderStatus =
  | "pending"           // 결제 대기
  | "paid"              // 1차 결제 완료 (상품+수수료)
  | "shipping_pending"  // 배송비 청구됨 (이메일 발송, 추가결제 대기)
  | "shipping_paid"     // 배송비 결제 완료 (발송 준비)
  | "shipped"           // 발송 완료
  | "delivered"         // 배송 완료
  | "cancelled"
  | "refunded";

export type CustomsStatus = "pending" | "in_review" | "cleared" | "held";

export interface ShippingAddress {
  name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
}

export interface Order {
  id: string;
  order_no: string | null;
  user_id: string | null;
  status: OrderStatus;
  subtotal_usd: number;
  shipping_usd: number;
  total_usd: number;
  payment_fee_usd: number;
  exchange_rate: number | null;
  estimated_weight_g: number | null;
  payment_method: "card" | "paypal" | "bank" | null;
  card_brand: string | null;
  card_last4: string | null;
  shipping_country: string | null;
  shipping_address: ShippingAddress | null;
  tracking_carrier: string | null;
  tracking_no: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  customs_status: CustomsStatus | null;
  customs_cleared_at: string | null;
  paid_at: string | null;
  paypal_order_id: string | null;
  paypal_capture_id: string | null;
  // 운영 메모/취소 정보 (migration 030)
  admin_memo: string | null;
  cancel_reason: string | null;
  cancelled_at: string | null;
  refunded_at: string | null;
  bundle_group: string | null;
  created_at: string;
}

export interface PaymentEvent {
  id: string;
  order_id: string | null;
  event_type: string;
  paypal_event_id: string | null;
  payload: Record<string, unknown>;
  source: "server" | "webhook" | "admin" | "cron";
  created_at: string;
}

export interface OrderAuditLog {
  id: string;
  order_id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  note: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  listing_id: string | null;
  title: string;
  title_en: string | null;
  image_url: string | null;
  price_usd: number;
  quantity: number;
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "결제 대기",
  paid: "결제 완료",
  shipping_pending: "배송비 결제 대기",
  shipping_paid: "추가결제 완료",
  shipped: "배송중",
  delivered: "배송 완료",
  cancelled: "취소",
  refunded: "환불",
};

export const CUSTOMS_STATUS_LABEL: Record<CustomsStatus, string> = {
  pending: "통관 대기",
  in_review: "통관 검토중",
  cleared: "통관 완료",
  held: "통관 보류",
};

export function formatKRW(n: number): string {
  return `₩${Math.round(n).toLocaleString()}`;
}

export function formatOrderDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${day} ${hh}:${mm}`;
}
