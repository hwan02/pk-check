// ===============================================================
// 결제 수수료 공식 — PayPal cross-border 실비 패스스루
//
// Kikidult 는 직판(reseller) 모델이라 "대행수수료"는 받지 않음.
// PayPal 해외 결제 표준 수수료를 그대로 패스스루:
//   PayPal cross-border: 4.4% + $0.30 per transaction
//
// 비율/고정수수료 변경 시 아래 상수만 수정.
// ===============================================================

export const PAYMENT_FEE_RATE = 0.044;   // 4.4%
export const PAYMENT_FEE_FIXED_USD = 0.30; // $0.30 per transaction

export interface FeeBreakdown {
  subtotal_usd: number;
  shipping_usd: number;
  payment_fee_usd: number;
  total_usd: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calcFees(subtotalUsd: number, shippingUsd: number): FeeBreakdown {
  // PayPal 수수료는 결제 전체 금액(상품 + 배송) 기준으로 발생.
  // 4.4% × (상품 + 배송) + $0.30
  const baseForFee = subtotalUsd + shippingUsd;
  const payment = round2(baseForFee * PAYMENT_FEE_RATE + PAYMENT_FEE_FIXED_USD);
  const total = round2(subtotalUsd + shippingUsd + payment);
  return {
    subtotal_usd: round2(subtotalUsd),
    shipping_usd: round2(shippingUsd),
    payment_fee_usd: payment,
    total_usd: total,
  };
}
