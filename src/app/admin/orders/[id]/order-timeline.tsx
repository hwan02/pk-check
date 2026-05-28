import { formatOrderDate, type OrderAuditLog, type PaymentEvent } from "@/lib/shop";

interface Props {
  events: PaymentEvent[];
  audit: OrderAuditLog[];
}

// 이벤트 타입 → 사람 친화 라벨 + 색상
const EVENT_LABEL: Record<string, { label: string; tone: string }> = {
  order_created: { label: "주문 생성 (PayPal create)", tone: "bg-blue-50 text-blue-700" },
  order_create_failed: { label: "주문 생성 실패", tone: "bg-red-50 text-red-700" },
  order_captured: { label: "결제 캡처 성공", tone: "bg-emerald-50 text-emerald-700" },
  order_capture_failed: { label: "결제 캡처 실패", tone: "bg-red-50 text-red-700" },
  stock_shortage_after_capture: { label: "⚠ 캡처 후 재고 부족", tone: "bg-orange-50 text-orange-700" },
  admin_cancel: { label: "어드민 취소", tone: "bg-gray-100 text-gray-700" },
  admin_refund_completed: { label: "어드민 환불 완료", tone: "bg-rose-50 text-rose-700" },
  admin_refund_failed: { label: "어드민 환불 실패", tone: "bg-red-50 text-red-700" },
  auto_expired: { label: "pending 자동 만료", tone: "bg-gray-100 text-gray-600" },
};

function eventTone(type: string): { label: string; tone: string } {
  if (EVENT_LABEL[type]) return EVENT_LABEL[type];
  if (type.startsWith("webhook.")) {
    return { label: `Webhook · ${type.replace("webhook.", "")}`, tone: "bg-violet-50 text-violet-700" };
  }
  return { label: type, tone: "bg-gray-100 text-gray-700" };
}

const ACTION_LABEL: Record<string, string> = {
  status_change: "상태 변경",
  update: "정보 수정",
  cancel: "취소",
  refund_full: "전액 환불",
  refund_partial: "부분 환불",
};

export default function OrderTimeline({ events, audit }: Props) {
  if (events.length === 0 && audit.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 mt-4">
      <h2 className="text-sm font-semibold mb-3">타임라인</h2>

      {/* 결제 이벤트 */}
      {events.length > 0 && (
        <div className="mb-5">
          <p className="text-[11px] font-semibold opacity-60 mb-2">결제 이벤트 ({events.length})</p>
          <ul className="space-y-1.5">
            {events.map((e) => {
              const t = eventTone(e.event_type);
              return (
                <li key={e.id} className="flex items-start gap-3 text-xs">
                  <span className="opacity-50 shrink-0 w-[110px] tabular-nums">
                    {formatOrderDate(e.created_at)}
                  </span>
                  <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${t.tone}`}>
                    {t.label}
                  </span>
                  <span className="opacity-50 text-[10px] uppercase">
                    {e.source}
                  </span>
                  {/* PayPal 응답에서 핵심 필드만 살짝 보여줌 */}
                  <details className="text-[10px] opacity-60 ml-auto">
                    <summary className="cursor-pointer">payload</summary>
                    <pre className="mt-1 max-w-md max-h-40 overflow-auto bg-[var(--surface)] p-2 rounded">
                      {JSON.stringify(e.payload, null, 2)}
                    </pre>
                  </details>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* 변경 이력 */}
      {audit.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold opacity-60 mb-2">변경 이력 ({audit.length})</p>
          <ul className="space-y-1.5">
            {audit.map((a) => (
              <li key={a.id} className="flex items-start gap-3 text-xs">
                <span className="opacity-50 shrink-0 w-[110px] tabular-nums">
                  {formatOrderDate(a.created_at)}
                </span>
                <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700">
                  {ACTION_LABEL[a.action] ?? a.action}
                </span>
                <span className="opacity-70">
                  {a.before_data && a.after_data ? (
                    <>
                      {Object.keys(a.after_data as Record<string, unknown>).map((k) => {
                        const before = (a.before_data as Record<string, unknown> | null)?.[k];
                        const after = (a.after_data as Record<string, unknown> | null)?.[k];
                        return (
                          <span key={k} className="mr-2">
                            <span className="opacity-60">{k}:</span>{" "}
                            <span className="line-through opacity-50">{JSON.stringify(before)}</span>{" → "}
                            <span className="font-semibold">{JSON.stringify(after)}</span>
                          </span>
                        );
                      })}
                    </>
                  ) : null}
                </span>
                {a.note && (
                  <span className="opacity-60 italic ml-2">&ldquo;{a.note}&rdquo;</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
