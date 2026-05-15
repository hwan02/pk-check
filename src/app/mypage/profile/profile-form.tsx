"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

interface Props {
  defaultName: string;
  email: string;
  defaultCustomsIdNo: string;
  defaultPhone: string;
  defaultRecipientName: string;
  defaultPostalCode: string;
  defaultAddress1: string;
  defaultAddress2: string;
  defaultCountry?: string;
  defaultCity?: string;
  defaultState?: string;
}

export default function ProfileForm(props: Props) {
  const router = useRouter();
  const [name, setName] = useState(props.defaultName);
  const [customsIdNo, setCustomsIdNo] = useState(props.defaultCustomsIdNo);
  const [phone, setPhone] = useState(props.defaultPhone);
  const [recipientName, setRecipientName] = useState(props.defaultRecipientName);
  const [country, setCountry] = useState(props.defaultCountry || "KR");
  const [postalCode, setPostalCode] = useState(props.defaultPostalCode);
  const [address1, setAddress1] = useState(props.defaultAddress1);
  const [address2, setAddress2] = useState(props.defaultAddress2);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const isKorea = country === "KR";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanedCustoms = customsIdNo.trim().toUpperCase();
    if (isKorea && cleanedCustoms && !/^P\d{12}$/.test(cleanedCustoms)) {
      setMessage({ type: "err", text: "개인통관고유부호는 P + 숫자 12자리 형식입니다." });
      return;
    }
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        customs_id_no: isKorea ? (cleanedCustoms || null) : null,
        phone: phone.trim(),
        recipient_name: recipientName.trim() || null,
        postal_code: postalCode.trim(),
        address1: address1.trim(),
        address2: address2.trim() || null,
        country,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage({ type: "ok", text: "저장되었습니다." });
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setMessage({ type: "err", text: d.error ?? "저장 실패" });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 계정 */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 sm:p-5 space-y-4">
        <h2 className="text-xs font-semibold tracking-widest uppercase opacity-60">계정</h2>
        <Field label="이메일">
          <input type="email" value={props.email} disabled className={`${inp} bg-[var(--surface)] opacity-70`} />
        </Field>
        <Field label="이름">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" className={inp} />
        </Field>
      </section>

      {/* 배송지 */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 sm:p-5 space-y-4">
        <h2 className="text-xs font-semibold tracking-widest uppercase opacity-60">배송지</h2>

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

        {/* 한국일 때만 통관고유부호 */}
        {isKorea && (
          <Field label="개인통관고유부호">
            <input
              value={customsIdNo}
              onChange={(e) => setCustomsIdNo(e.target.value.toUpperCase())}
              placeholder="P012345678901"
              maxLength={13}
              className={`${inp} font-mono`}
            />
            <a
              href="https://unipass.customs.go.kr/csp/persIndex.do"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] opacity-60 mt-1 inline-block underline underline-offset-2"
            >
              발급/조회 (관세청 UNI-PASS)
            </a>
          </Field>
        )}
      </section>

      {message && (
        <p className={`text-xs ${message.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold disabled:opacity-50 cursor-pointer"
      >
        {saving ? "저장 중..." : "저장"}
      </button>
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
