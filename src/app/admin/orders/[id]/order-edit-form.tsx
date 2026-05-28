"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Order } from "@/lib/shop";
import { KNOWN_CARRIERS, trackingUrlFor } from "@/lib/tracking";

interface Props {
  order: Order;
}

// 어드민이 일반적인 흐름에서 선택하는 상태들 — cancelled/refunded 는 별도 액션 버튼으로
const STATUS_OPTIONS = [
  { value: "pending", label: "결제 대기" },
  { value: "paid", label: "결제 완료" },
  { value: "shipping_pending", label: "배송비 결제 대기" },
  { value: "shipping_paid", label: "추가결제 완료" },
  { value: "shipped", label: "배송중" },
  { value: "delivered", label: "배송 완료" },
];

const CUSTOMS_OPTIONS = [
  { value: "pending", label: "통관 대기" },
  { value: "in_review", label: "통관 검토중" },
  { value: "cleared", label: "통관 완료" },
  { value: "held", label: "통관 보류" },
];

export default function OrderEditForm({ order }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [status, setStatus] = useState(order.status);
  const [trackingCarrier, setTrackingCarrier] = useState(order.tracking_carrier ?? "");
  const [trackingNo, setTrackingNo] = useState(order.tracking_no ?? "");
  const [trackingUrl, setTrackingUrl] = useState(order.tracking_url ?? "");
  const [customsStatus, setCustomsStatus] = useState(order.customs_status ?? "pending");
  const [paymentFee, setPaymentFee] = useState(String(order.payment_fee_usd));
  const [exchangeRate, setExchangeRate] = useState(
    order.exchange_rate ? String(order.exchange_rate) : "",
  );
  const [weightG, setWeightG] = useState(
    order.estimated_weight_g ? String(order.estimated_weight_g) : "",
  );
  const [cardBrand, setCardBrand] = useState(order.card_brand ?? "");
  const [cardLast4, setCardLast4] = useState(order.card_last4 ?? "");
  const [adminMemo, setAdminMemo] = useState(order.admin_memo ?? "");

  // tracking carrier / no 변경 시 → URL 자동 추천 (URL 비어있을 때만 덮어씀)
  useEffect(() => {
    if (trackingUrl) return;
    const auto = trackingUrlFor(trackingCarrier, trackingNo);
    if (auto) setTrackingUrl(auto);
    // trackingUrl 이 비어있을 때만 채우니까 무한루프 없음
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackingCarrier, trackingNo]);

  // 취소/환불 액션 — 별도 호출
  const [actionLoading, setActionLoading] = useState<"cancel" | "refund" | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");

  const finalStatus = order.status === "cancelled" || order.status === "refunded";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    const body = {
      status,
      tracking_carrier: trackingCarrier.trim() || null,
      tracking_no: trackingNo.trim() || null,
      tracking_url: trackingUrl.trim() || null,
      customs_status: customsStatus,
      payment_fee_usd: Number(paymentFee) || 0,
      exchange_rate: exchangeRate ? Number(exchangeRate) : null,
      estimated_weight_g: weightG ? Number(weightG) : null,
      card_brand: cardBrand.trim() || null,
      card_last4: cardLast4.trim() || null,
      admin_memo: adminMemo.trim() || null,
    };

    const res = await fetch(`/api/admin/orders/${order.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      setMsg({ type: "ok", text: "저장되었습니다." });
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setMsg({ type: "err", text: d.error ?? "저장 실패" });
    }
  }

  async function doCancel() {
    if (!confirm(`주문을 취소하시겠어요?${order.status === "pending" ? "" : " 재고가 복구됩니다."}`)) return;
    setActionLoading("cancel");
    setMsg(null);
    const res = await fetch(`/api/admin/orders/${order.id}/cancel`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: cancelReason.trim() || undefined }),
    });
    setActionLoading(null);
    if (res.ok) {
      setMsg({ type: "ok", text: "취소되었습니다." });
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setMsg({ type: "err", text: d.error ?? "취소 실패" });
    }
  }

  async function doRefund() {
    const amount = refundAmount.trim() ? Number(refundAmount) : undefined;
    if (amount !== undefined && (!Number.isFinite(amount) || amount <= 0)) {
      setMsg({ type: "err", text: "환불 금액을 확인하세요" });
      return;
    }
    const isFull = amount === undefined || amount === order.total_usd;
    const confirmMsg = isFull
      ? `전액 환불($${order.total_usd})하시겠어요? PayPal 결제가 환불되고 재고가 복구됩니다.`
      : `$${amount} 부분 환불하시겠어요? (상태는 그대로 유지됨)`;
    if (!confirm(confirmMsg)) return;
    setActionLoading("refund");
    setMsg(null);
    const res = await fetch(`/api/admin/orders/${order.id}/refund`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        amount_usd: amount,
        reason: refundReason.trim() || undefined,
      }),
    });
    setActionLoading(null);
    if (res.ok) {
      const d = await res.json();
      setMsg({
        type: "ok",
        text: d.full_refund ? "전액 환불 완료." : "부분 환불 완료.",
      });
      setRefundAmount("");
      setRefundReason("");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setMsg({ type: "err", text: d.error ?? "환불 실패" });
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 space-y-5"
    >
      <h2 className="text-sm font-semibold">배송 / 통관 / 결제 정보</h2>

      {/* 상태 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="주문 상태">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Order["status"])}
            disabled={finalStatus}
            className={sel}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
            {/* 종결 상태는 옵션에 표시만 (잠금) */}
            {(order.status === "cancelled" || order.status === "refunded") && (
              <option value={order.status}>
                {order.status === "cancelled" ? "취소" : "환불"}
              </option>
            )}
          </select>
          {finalStatus && (
            <p className="text-[10px] text-rose-600 mt-1">
              {order.status === "cancelled" ? "취소된 주문 — 수정 불가" : "환불된 주문 — 수정 불가"}
            </p>
          )}
        </Field>
        <Field label="통관 상태">
          <select
            value={customsStatus}
            onChange={(e) => setCustomsStatus(e.target.value as Order["customs_status"] & string)}
            className={sel}
          >
            {CUSTOMS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* 배송 추적 */}
      <fieldset className="space-y-3 pt-3 border-t border-[var(--border)]">
        <legend className="text-xs font-semibold opacity-70 mb-2">배송 추적</legend>
        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-3">
          <Field label="배송사">
            <input
              list="carriers"
              value={trackingCarrier}
              onChange={(e) => setTrackingCarrier(e.target.value)}
              placeholder="EMS"
              className={inp}
            />
            <datalist id="carriers">
              {KNOWN_CARRIERS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="송장번호">
            <input
              value={trackingNo}
              onChange={(e) => setTrackingNo(e.target.value)}
              placeholder="EE123456789KR"
              className={`${inp} font-mono`}
            />
          </Field>
        </div>
        <Field label="추적 URL (배송사+송장번호 입력 시 자동 채움)">
          <input
            type="url"
            value={trackingUrl}
            onChange={(e) => setTrackingUrl(e.target.value)}
            placeholder="https://trace.epost.go.kr/..."
            className={inp}
          />
        </Field>
      </fieldset>

      {/* 수수료/환율/중량 */}
      <fieldset className="space-y-3 pt-3 border-t border-[var(--border)]">
        <legend className="text-xs font-semibold opacity-70 mb-2">수수료 · 환율 · 중량</legend>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="결제수수료 (USD)">
            <input type="number" step="0.01" value={paymentFee}
              onChange={(e) => setPaymentFee(e.target.value)} className={inp} />
          </Field>
          <Field label="계산환율 (KRW/USD)">
            <input type="number" step="0.01" value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)} placeholder="1378.50" className={inp} />
          </Field>
          <Field label="예상중량 (g)">
            <input type="number" value={weightG}
              onChange={(e) => setWeightG(e.target.value)} placeholder="320" className={inp} />
          </Field>
        </div>
      </fieldset>

      {/* 결제 카드 정보 */}
      <fieldset className="space-y-3 pt-3 border-t border-[var(--border)]">
        <legend className="text-xs font-semibold opacity-70 mb-2">결제 카드</legend>
        <div className="grid grid-cols-2 md:grid-cols-[1fr_140px] gap-3">
          <Field label="카드 브랜드">
            <input value={cardBrand} onChange={(e) => setCardBrand(e.target.value)}
              placeholder="VISA / Master / AMEX" className={inp} />
          </Field>
          <Field label="끝 4자리">
            <input value={cardLast4} onChange={(e) => setCardLast4(e.target.value)}
              placeholder="4242" maxLength={4} className={`${inp} font-mono`} />
          </Field>
        </div>
      </fieldset>

      {/* 어드민 메모 */}
      <fieldset className="space-y-3 pt-3 border-t border-[var(--border)]">
        <legend className="text-xs font-semibold opacity-70 mb-2">어드민 메모 (내부)</legend>
        <Field label="">
          <textarea
            value={adminMemo}
            onChange={(e) => setAdminMemo(e.target.value)}
            placeholder="예: 고객 한국어 연락 가능 / 별도 포장 / 분쟁 협상중 등"
            className={`${inp} min-h-[68px] resize-y`}
          />
        </Field>
      </fieldset>

      {msg && (
        <p className={`text-xs ${msg.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>
          {msg.text}
        </p>
      )}

      <button
        type="submit"
        disabled={saving || finalStatus}
        className="w-full py-3 rounded-lg bg-[var(--primary)] text-white text-sm font-semibold disabled:opacity-50"
      >
        {saving ? "저장 중..." : "저장"}
      </button>

      {/* === 위험 액션 — 취소 / 환불 === */}
      {!finalStatus && (
        <fieldset className="space-y-4 pt-5 border-t-2 border-rose-200 mt-2">
          <legend className="text-xs font-bold text-rose-700">위험 액션</legend>

          {/* 취소 */}
          <div className="rounded-lg border border-rose-200 bg-rose-50/40 p-3 space-y-2">
            <p className="text-xs font-semibold text-rose-800">
              주문 취소{" "}
              <span className="opacity-60 font-normal">
                (status=cancelled, 재고 복구. PayPal 환불은 별도)
              </span>
            </p>
            <input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="취소 사유 (선택)"
              className={inp}
            />
            <button
              type="button"
              onClick={doCancel}
              disabled={!!actionLoading}
              className="text-xs px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-100 disabled:opacity-50"
            >
              {actionLoading === "cancel" ? "처리 중..." : "주문 취소"}
            </button>
          </div>

          {/* 환불 */}
          {order.paypal_capture_id && ["paid", "shipping_paid", "shipped", "delivered"].includes(order.status) && (
            <div className="rounded-lg border border-rose-200 bg-rose-50/40 p-3 space-y-2">
              <p className="text-xs font-semibold text-rose-800">
                환불 (PayPal refund API + 재고 복구)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder={`전체 환불은 비워둠 (총 $${order.total_usd})`}
                  className={inp}
                />
                <input
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="환불 사유 (선택)"
                  className={inp}
                />
              </div>
              <button
                type="button"
                onClick={doRefund}
                disabled={!!actionLoading}
                className="text-xs px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {actionLoading === "refund"
                  ? "환불 중..."
                  : refundAmount
                    ? `$${refundAmount} 부분 환불`
                    : "전액 환불"}
              </button>
            </div>
          )}
        </fieldset>
      )}
    </form>
  );
}

const inp =
  "w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] focus:border-[var(--primary)] outline-none disabled:opacity-50";
const sel = `${inp} cursor-pointer`;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold opacity-60 mb-1">{label}</span>
      {children}
    </label>
  );
}
