// ===============================================================
// 결제 수수료 공식 — PayPal cross-border 실비 패스스루
//
// 배송비는 추가 정산이므로 1차 결제에 포함하지 않음.
// 수수료는 상품 합계만 기준으로 계산.
//   PayPal cross-border: 4.4% + $0.30 per transaction
// ===============================================================

export const PAYMENT_FEE_RATE = 0.044;   // 4.4%
export const PAYMENT_FEE_FIXED_USD = 0.30; // $0.30 per transaction

export interface FeeBreakdown {
  subtotal_usd: number;
  shipping_usd: number;
  payment_fee_usd: number;
  total_usd: number; // 1차 결제금액 = 상품 + 수수료 (배송비 미포함)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calcFees(subtotalUsd: number, shippingUsd: number): FeeBreakdown {
  // 수수료는 상품 합계 기준 (배송비 제외)
  const payment = round2(subtotalUsd * PAYMENT_FEE_RATE + PAYMENT_FEE_FIXED_USD);
  // 1차 결제 = 상품 + 수수료 (배송비는 추가 정산)
  const total = round2(subtotalUsd + payment);
  return {
    subtotal_usd: round2(subtotalUsd),
    shipping_usd: round2(shippingUsd),
    payment_fee_usd: payment,
    total_usd: total,
  };
}
