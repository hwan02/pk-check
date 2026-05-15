"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Order } from "@/lib/shop";

interface Props {
  order: Order;
}

const STATUS_OPTIONS = [
  { value: "paid", label: "결제 완료" },
  { value: "shipped", label: "배송중" },
  { value: "delivered", label: "배송 완료" },
  { value: "cancelled", label: "취소" },
  { value: "refunded", label: "환불" },
];

const CUSTOMS_OPTIONS = [
  { value: "pending", label: "통관 대기" },
  { value: "in_review", label: "통관 검토중" },
  { value: "cleared", label: "통관 완료" },
  { value: "held", label: "통관 보류" },
];

const CARRIERS = ["EMS", "DHL", "FedEx", "UPS", "CJ대한통운", "한진택배"];

export default function OrderEditForm({ order }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [status, setStatus] = useState(order.status);
  const [trackingCarrier, setTrackingCarrier] = useState(order.tracking_carrier ?? "");
  const [trackingNo, setTrackingNo] = useState(order.tracking_no ?? "");
  const [trackingUrl, setTrackingUrl] = useState(order.tracking_url ?? "");
  const [customsStatus, setCustomsStatus] = useState(order.customs_status ?? "pending");
  const [agentFee, setAgentFee] = useState(String(order.agent_fee_usd));
  const [paymentFee, setPaymentFee] = useState(String(order.payment_fee_usd));
  const [exchangeRate, setExchangeRate] = useState(
    order.exchange_rate ? String(order.exchange_rate) : "",
  );
  const [weightG, setWeightG] = useState(
    order.estimated_weight_g ? String(order.estimated_weight_g) : "",
  );
  const [cardBrand, setCardBrand] = useState(order.card_brand ?? "");
  const [cardLast4, setCardLast4] = useState(order.card_last4 ?? "");

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
      agent_fee_usd: Number(agentFee) || 0,
      payment_fee_usd: Number(paymentFee) || 0,
      exchange_rate: exchangeRate ? Number(exchangeRate) : null,
      estimated_weight_g: weightG ? Number(weightG) : null,
      card_brand: cardBrand.trim() || null,
      card_last4: cardLast4.trim() || null,
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
            className={sel}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
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
        <legend className="text-xs font-semibold opacity-70 mb-2">
          배송 추적
        </legend>
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
              {CARRIERS.map((c) => (
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
        <Field label="추적 URL (선택)">
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
        <legend className="text-xs font-semibold opacity-70 mb-2">
          수수료 · 환율 · 중량
        </legend>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="대행수수료 (USD)">
            <input
              type="number"
              step="0.01"
              value={agentFee}
              onChange={(e) => setAgentFee(e.target.value)}
              className={inp}
            />
          </Field>
          <Field label="결제수수료 (USD)">
            <input
              type="number"
              step="0.01"
              value={paymentFee}
              onChange={(e) => setPaymentFee(e.target.value)}
              className={inp}
            />
          </Field>
          <Field label="계산환율 (KRW/USD)">
            <input
              type="number"
              step="0.01"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              placeholder="1378.50"
              className={inp}
            />
          </Field>
          <Field label="예상중량 (g)">
            <input
              type="number"
              value={weightG}
              onChange={(e) => setWeightG(e.target.value)}
              placeholder="320"
              className={inp}
            />
          </Field>
        </div>
      </fieldset>

      {/* 결제 카드 정보 */}
      <fieldset className="space-y-3 pt-3 border-t border-[var(--border)]">
        <legend className="text-xs font-semibold opacity-70 mb-2">
          결제 카드
        </legend>
        <div className="grid grid-cols-2 md:grid-cols-[1fr_140px] gap-3">
          <Field label="카드 브랜드">
            <input
              value={cardBrand}
              onChange={(e) => setCardBrand(e.target.value)}
              placeholder="VISA / Master / AMEX"
              className={inp}
            />
          </Field>
          <Field label="끝 4자리">
            <input
              value={cardLast4}
              onChange={(e) => setCardLast4(e.target.value)}
              placeholder="4242"
              maxLength={4}
              className={`${inp} font-mono`}
            />
          </Field>
        </div>
      </fieldset>

      {msg && (
        <p
          className={`text-xs ${
            msg.type === "ok" ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {msg.text}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 rounded-lg bg-[var(--primary)] text-white text-sm font-semibold disabled:opacity-50"
      >
        {saving ? "저장 중..." : "저장"}
      </button>
    </form>
  );
}

const inp =
  "w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] focus:border-[var(--primary)] outline-none";
const sel = `${inp} cursor-pointer`;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold opacity-60 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
