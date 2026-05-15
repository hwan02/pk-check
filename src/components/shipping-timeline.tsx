import { formatOrderDate, type Order } from "@/lib/shop";

interface Step {
  label: string;
  sublabel?: string;
  date?: string | null;
  done: boolean;
  active: boolean;
}

const AFTER_PAID = ["paid", "shipping_pending", "shipping_paid", "shipped", "delivered"];
const AFTER_SHIPPING_PAID = ["shipping_paid", "shipped", "delivered"];
const AFTER_SHIPPED = ["shipped", "delivered"];

function getInternationalSteps(order: Order): Step[] {
  const s = order.status;
  return [
    {
      label: "결제 완료",
      sublabel: "상품 준비 중",
      date: order.paid_at,
      done: AFTER_PAID.includes(s),
      active: s === "paid",
    },
    {
      label: "배송비 청구",
      sublabel: "중량 측정 → 이메일 안내",
      date: null,
      done: ["shipping_pending", ...AFTER_SHIPPING_PAID].includes(s),
      active: s === "shipping_pending",
    },
    {
      label: "추가결제 완료",
      sublabel: "배송비 결제 확인",
      date: null,
      done: AFTER_SHIPPING_PAID.includes(s),
      active: s === "shipping_paid",
    },
    {
      label: "발송 완료",
      sublabel: "한국 우체국 접수",
      date: order.shipped_at,
      done: AFTER_SHIPPED.includes(s),
      active: s === "shipped" && !order.customs_cleared_at,
    },
    {
      label: "운송 중",
      sublabel: "항공편 이동 → 도착국 세관",
      date: order.customs_cleared_at,
      done: !!order.customs_cleared_at || s === "delivered",
      active: s === "shipped" && !!order.shipped_at && !order.delivered_at,
    },
    {
      label: "배송 완료",
      sublabel: "수령 확인",
      date: order.delivered_at,
      done: s === "delivered",
      active: s === "delivered",
    },
  ];
}

function getDomesticSteps(order: Order): Step[] {
  const s = order.status;
  return [
    {
      label: "결제 완료",
      sublabel: "상품 준비 중",
      date: order.paid_at,
      done: AFTER_PAID.includes(s),
      active: s === "paid" || s === "shipping_pending" || s === "shipping_paid",
    },
    {
      label: "발송 완료",
      sublabel: "택배사 접수",
      date: order.shipped_at,
      done: AFTER_SHIPPED.includes(s),
      active: s === "shipped" && !order.delivered_at,
    },
    {
      label: "배송 중",
      sublabel: "배송 진행",
      date: null,
      done: s === "delivered",
      active: s === "shipped",
    },
    {
      label: "배송 완료",
      sublabel: "수령 확인",
      date: order.delivered_at,
      done: s === "delivered",
      active: s === "delivered",
    },
  ];
}

export default function ShippingTimeline({
  order,
  isDomestic,
}: {
  order: Order;
  isDomestic: boolean;
}) {
  const steps = isDomestic ? getDomesticSteps(order) : getInternationalSteps(order);

  return (
    <div className="relative">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <div key={step.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`w-3 h-3 rounded-full flex-shrink-0 mt-0.5 ${
                  step.done
                    ? "bg-[var(--primary)]"
                    : step.active
                    ? "bg-[var(--accent)] ring-2 ring-[var(--accent)] ring-offset-2"
                    : "bg-[var(--border)]"
                }`}
              />
              {!isLast && (
                <div
                  className={`w-0.5 flex-1 min-h-[28px] ${
                    step.done ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                  }`}
                />
              )}
            </div>
            <div className={`pb-4 ${step.done || step.active ? "" : "opacity-40"}`}>
              <p className={`text-xs font-semibold ${step.active ? "text-[var(--accent)]" : ""}`}>
                {step.label}
              </p>
              {step.sublabel && (
                <p className="text-[10px] opacity-60 mt-0.5">{step.sublabel}</p>
              )}
              {step.date && (
                <p className="text-[10px] opacity-50 mt-0.5">{formatOrderDate(step.date)}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
