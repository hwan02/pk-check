"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Props {
  defaultName: string;
  email: string;
  defaultCustomsIdNo: string;
  defaultPhone: string;
}

export default function ProfileForm(props: Props) {
  const router = useRouter();
  const [name, setName] = useState(props.defaultName);
  const [customsIdNo, setCustomsIdNo] = useState(props.defaultCustomsIdNo);
  const [phone, setPhone] = useState(props.defaultPhone);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanedCustoms = customsIdNo.trim().toUpperCase();
    if (cleanedCustoms && !/^P\d{12}$/.test(cleanedCustoms)) {
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
        customs_id_no: cleanedCustoms || null,
        phone: phone.trim() || null,
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
        <Field label="연락처">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-0000-0000"
            className={inp}
          />
        </Field>
      </section>

      {/* 배송지 안내 */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold tracking-widest uppercase opacity-60 mb-1">배송지</h2>
            <p className="text-xs opacity-70">여러 배송지를 등록하고 주 배송지를 설정할 수 있습니다.</p>
          </div>
          <Link
            href="/mypage/addresses"
            className="text-xs font-semibold px-3 py-2 rounded-lg border border-[var(--border)] hover:border-[var(--primary)] flex-shrink-0"
          >
            배송지 관리
          </Link>
        </div>
      </section>

      {/* 통관고유부호 */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 sm:p-5 space-y-4">
        <h2 className="text-xs font-semibold tracking-widest uppercase opacity-60">통관 정보</h2>
        <Field label="개인통관고유부호 (국내 배송 시)">
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
