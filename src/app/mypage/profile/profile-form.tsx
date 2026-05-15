"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  defaultName: string;
  email: string;
  defaultCustomsIdNo: string;
  defaultPhone: string;
  defaultRecipientName: string;
  defaultPostalCode: string;
  defaultAddress1: string;
  defaultAddress2: string;
}

export default function ProfileForm(props: Props) {
  const router = useRouter();
  const [name, setName] = useState(props.defaultName);
  const [customsIdNo, setCustomsIdNo] = useState(props.defaultCustomsIdNo);
  const [phone, setPhone] = useState(props.defaultPhone);
  const [recipientName, setRecipientName] = useState(props.defaultRecipientName);
  const [postalCode, setPostalCode] = useState(props.defaultPostalCode);
  const [address1, setAddress1] = useState(props.defaultAddress1);
  const [address2, setAddress2] = useState(props.defaultAddress2);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanedCustoms = customsIdNo.trim().toUpperCase();
    if (cleanedCustoms && !/^P\d{12}$/.test(cleanedCustoms)) {
      setMessage({
        type: "err",
        text: "개인통관고유부호는 P + 숫자 12자리 형식입니다.",
      });
      return;
    }
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        customs_id_no: cleanedCustoms || null,
        phone: phone.trim(),
        recipient_name: recipientName.trim() || null,
        postal_code: postalCode.trim(),
        address1: address1.trim(),
        address2: address2.trim() || null,
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
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 space-y-4">
        <h2 className="text-xs font-semibold tracking-widest uppercase opacity-60">
          계정
        </h2>
        <Field label="이메일">
          <input
            type="email"
            value={props.email}
            disabled
            className={`${inp} bg-[var(--surface)] opacity-70`}
          />
          <p className="text-[11px] opacity-50 mt-1">이메일은 변경할 수 없습니다.</p>
        </Field>
        <Field label="이름">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름"
            className={inp}
          />
        </Field>
      </section>

      {/* 통관/배송 */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 space-y-4">
        <h2 className="text-xs font-semibold tracking-widest uppercase opacity-60">
          통관 · 배송정보
        </h2>

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

        <Field label="수령인">
          <input
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder={name || "수령인 이름"}
            className={inp}
          />
        </Field>

        <Field label="휴대폰">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-0000-0000"
            className={inp}
          />
        </Field>

        <div className="grid grid-cols-[120px_1fr] gap-2">
          <Field label="우편번호">
            <input
              inputMode="numeric"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="04524"
              maxLength={6}
              className={inp}
            />
          </Field>
          <Field label="기본 주소">
            <input
              value={address1}
              onChange={(e) => setAddress1(e.target.value)}
              placeholder="서울 중구 세종대로 110"
              className={inp}
            />
          </Field>
        </div>

        <Field label="상세 주소">
          <input
            value={address2}
            onChange={(e) => setAddress2(e.target.value)}
            placeholder="동/호수"
            className={inp}
          />
        </Field>
      </section>

      {message && (
        <p
          className={`text-xs ${
            message.type === "ok" ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {message.text}
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
  "w-full px-3 py-2.5 text-sm rounded-lg border border-[var(--border)] focus:border-[var(--primary)] outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold opacity-60 mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
