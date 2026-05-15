"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ShippingAddress } from "@/lib/addresses";

const COUNTRIES = [
  { code: "KR", label: "대한민국", dial: "+82" },
  { code: "JP", label: "일본", dial: "+81" },
  { code: "US", label: "미국", dial: "+1" },
  { code: "CA", label: "캐나다", dial: "+1" },
  { code: "GB", label: "영국", dial: "+44" },
  { code: "AU", label: "호주", dial: "+61" },
  { code: "DE", label: "독일", dial: "+49" },
  { code: "FR", label: "프랑스", dial: "+33" },
  { code: "SG", label: "싱가포르", dial: "+65" },
  { code: "TW", label: "대만", dial: "+886" },
  { code: "HK", label: "홍콩", dial: "+852" },
  { code: "TH", label: "태국", dial: "+66" },
  { code: "VN", label: "베트남", dial: "+84" },
  { code: "PH", label: "필리핀", dial: "+63" },
  { code: "MY", label: "말레이시아", dial: "+60" },
  { code: "ID", label: "인도네시아", dial: "+62" },
];

type Mode = { kind: "list" } | { kind: "new" } | { kind: "edit"; id: string };

export default function AddressesManager({ initial }: { initial: ShippingAddress[] }) {
  const router = useRouter();
  const [items, setItems] = useState<ShippingAddress[]>(initial);
  const [mode, setMode] = useState<Mode>({ kind: "list" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function refresh() {
    const res = await fetch("/api/addresses", { cache: "no-store" });
    if (res.ok) {
      const json = (await res.json()) as { addresses: ShippingAddress[] };
      setItems(json.addresses);
    }
    router.refresh();
  }

  async function handleSetDefault(id: string) {
    setBusyId(id);
    setMessage(null);
    const res = await fetch(`/api/addresses/${id}/default`, { method: "POST" });
    setBusyId(null);
    if (res.ok) {
      setMessage({ type: "ok", text: "주 배송지로 설정되었습니다." });
      await refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setMessage({ type: "err", text: d.error ?? "변경 실패" });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("이 배송지를 삭제하시겠습니까?")) return;
    setBusyId(id);
    setMessage(null);
    const res = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
    setBusyId(null);
    if (res.ok) {
      setMessage({ type: "ok", text: "삭제되었습니다." });
      await refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setMessage({ type: "err", text: d.error ?? "삭제 실패" });
    }
  }

  if (mode.kind !== "list") {
    const editing = mode.kind === "edit" ? items.find((a) => a.id === mode.id) : null;
    return (
      <AddressForm
        initial={editing}
        onCancel={() => setMode({ kind: "list" })}
        onSaved={async () => {
          setMode({ kind: "list" });
          setMessage({ type: "ok", text: "저장되었습니다." });
          await refresh();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <p className={`text-xs ${message.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>
          {message.text}
        </p>
      )}

      {items.length === 0 ? (
        <p className="text-xs opacity-60 text-center py-10">등록된 배송지가 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li
              key={a.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 sm:p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                {a.is_default && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--primary)] text-white">
                    주 배송지
                  </span>
                )}
                {a.label && (
                  <span className="text-xs font-semibold opacity-80">{a.label}</span>
                )}
                <span className="text-[11px] opacity-50 ml-auto">{a.country}</span>
              </div>
              <p className="text-sm font-semibold">{a.recipient_name}</p>
              <p className="text-xs opacity-80 mt-0.5">
                {a.postal_code} {a.address1}
                {a.address2 ? `, ${a.address2}` : ""}
              </p>
              {a.phone && <p className="text-xs opacity-60 mt-0.5">{a.phone}</p>}

              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[var(--border)]">
                {!a.is_default && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(a.id)}
                    disabled={busyId === a.id}
                    className="text-[11px] px-3 py-1.5 rounded-lg border border-[var(--border)] hover:border-[var(--primary)] disabled:opacity-50 cursor-pointer"
                  >
                    주 배송지로 설정
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMode({ kind: "edit", id: a.id })}
                  className="text-[11px] px-3 py-1.5 rounded-lg border border-[var(--border)] hover:border-[var(--primary)] cursor-pointer"
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(a.id)}
                  disabled={busyId === a.id}
                  className="text-[11px] px-3 py-1.5 rounded-lg border border-[var(--border)] text-red-600 hover:border-red-400 disabled:opacity-50 ml-auto cursor-pointer"
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setMode({ kind: "new" })}
        className="w-full py-3 rounded-xl border-2 border-dashed border-[var(--border)] text-sm font-semibold hover:border-[var(--primary)] hover:text-[var(--primary)] cursor-pointer"
      >
        + 새 배송지 추가
      </button>
    </div>
  );
}

function AddressForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: ShippingAddress | null | undefined;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [recipientName, setRecipientName] = useState(initial?.recipient_name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [country, setCountry] = useState(initial?.country ?? "KR");
  const [postalCode, setPostalCode] = useState(initial?.postal_code ?? "");
  const [address1, setAddress1] = useState(initial?.address1 ?? "");
  const [address2, setAddress2] = useState(initial?.address2 ?? "");
  const [isDefault, setIsDefault] = useState(initial?.is_default ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isKorea = country === "KR";
  const isEdit = !!initial;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const body = {
      label: label.trim() || null,
      recipient_name: recipientName.trim(),
      phone: phone.trim() || null,
      country,
      postal_code: postalCode.trim(),
      address1: address1.trim(),
      address2: address2.trim() || null,
      is_default: isDefault,
    };
    const url = isEdit ? `/api/addresses/${initial!.id}` : "/api/addresses";
    const res = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      onSaved();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "저장 실패");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 sm:p-5 space-y-4">
        <h2 className="text-xs font-semibold tracking-widest uppercase opacity-60">
          {isEdit ? "배송지 수정" : "새 배송지"}
        </h2>

        <Field label="별칭 (선택)">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="집, 회사 등"
            maxLength={20}
            className={inp}
          />
        </Field>

        <Field label="국가">
          <select value={country} onChange={(e) => setCountry(e.target.value)} className={inp}>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </Field>

        <Field label="수령인">
          <input
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder={isKorea ? "수령인 이름" : "Full Name"}
            className={inp}
          />
        </Field>

        <Field label="연락처">
          <div className="flex gap-2">
            <span className="flex items-center px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm opacity-70 flex-shrink-0">
              {COUNTRIES.find((c) => c.code === country)?.dial ?? "+82"}
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={isKorea ? "010-0000-0000" : "234 567 8900"}
              className={inp}
            />
          </div>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3">
          <Field label={isKorea ? "우편번호" : "Postal / ZIP Code"}>
            <input
              inputMode="numeric"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder={isKorea ? "04524" : "10001"}
              maxLength={10}
              className={inp}
            />
          </Field>
          <Field label={isKorea ? "기본 주소" : "Address Line 1"}>
            <input
              value={address1}
              onChange={(e) => setAddress1(e.target.value)}
              placeholder={isKorea ? "서울 중구 세종대로 110" : "Street address"}
              className={inp}
            />
          </Field>
        </div>

        <Field label={isKorea ? "상세 주소" : "Address Line 2"}>
          <input
            value={address2}
            onChange={(e) => setAddress2(e.target.value)}
            placeholder={isKorea ? "동/호수" : "Apt, Suite, Unit (optional)"}
            className={inp}
          />
        </Field>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="w-4 h-4 cursor-pointer"
          />
          <span className="text-sm">주 배송지로 설정</span>
        </label>
      </section>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl border border-[var(--border)] text-sm font-semibold cursor-pointer"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-3 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold disabled:opacity-50 cursor-pointer"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </form>
  );
}

const inp =
  "w-full px-3 py-2.5 text-sm rounded-lg border border-[var(--border)] focus:border-[var(--primary)] outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold opacity-60 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
