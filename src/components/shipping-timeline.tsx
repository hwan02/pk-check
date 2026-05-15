import { formatOrderDate, type Order } from "@/lib/shop";

interface Step {
  label: string;
  sublabel?: string;
  date?: string | null;
  done: boolean;
  active: boolean;
}

function getInternationalSteps(order: Order): Step[] {
  const status = order.status;
  const steps: Step[] = [
    {
      label: "결제 완료",
      sublabel: "상품 준비 중",
      date: order.paid_at,
      done: ["paid", "shipped", "delivered"].includes(status),
      active: status === "paid" && !order.shipped_at,
    },
    {
      label: "발송 완료",
      sublabel: "한국 우체국 접수",
      date: order.shipped_at,
      done: !!order.shipped_at,
      active: !!order.shipped_at && !order.customs_cleared_at && status !== "delivered",
    },
    {
      label: "수출 통관",
      sublabel: "한국 세관 처리 (자동)",
      date: null,
      done: !!order.customs_status && order.customs_status !== "pending",
      active: false, // 한국 수출은 자동이라 별도 표시 불필요
    },
    {
      label: "운송 중",
      sublabel: "항공편 이동",
      date: null,
      done: !!order.customs_cleared_at || status === "delivered",
      active: !!order.shipped_at && !order.delivered_at && status !== "paid",
    },
    {
      label: "도착국 통관",
      sublabel: "수입국 세관 심사",
      date: order.customs_cleared_at,
      done: !!order.customs_cleared_at,
      active: false,
    },
    {
      label: "배송 완료",
      sublabel: "수령 확인",
      date: order.delivered_at,
      done: status === "delivered",
      active: status === "delivered",
    },
  ];
  return steps;
}

function getDomesticSteps(order: Order): Step[] {
  const status = order.status;
  return [
    {
      label: "결제 완료",
      sublabel: "상품 준비 중",
      date: order.paid_at,
      done: ["paid", "shipped", "delivered"].includes(status),
      active: status === "paid" && !order.shipped_at,
    },
    {
      label: "발송 완료",
      sublabel: "택배사 접수",
      date: order.shipped_at,
      done: !!order.shipped_at,
      active: !!order.shipped_at && status !== "delivered",
    },
    {
      label: "배송 중",
      sublabel: "배송 진행",
      date: null,
      done: status === "delivered",
      active: !!order.shipped_at && status !== "delivered",
    },
    {
      label: "배송 완료",
      sublabel: "수령 확인",
      date: order.delivered_at,
      done: status === "delivered",
      active: status === "delivered",
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
            {/* 점 + 라인 */}
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
            {/* 텍스트 */}
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
