"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [customsIdNo, setCustomsIdNo] = useState("");
  const [phone, setPhone] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    const cleanedCustoms = customsIdNo.trim().toUpperCase();
    if (!/^P\d{12}$/.test(cleanedCustoms)) {
      setError("개인통관고유부호는 P + 숫자 12자리 형식입니다. (예: P012345678901)");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          customs_id_no: cleanedCustoms,
          phone: phone.trim(),
          recipient_name: recipientName.trim() || name,
          postal_code: postalCode.trim(),
          address1: address1.trim(),
          address2: address2.trim(),
          country: "KR",
        },
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.user && !data.session) {
      setInfo("이메일로 인증 링크를 보냈습니다. 확인 후 로그인 해주세요.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* 계정 */}
      <section>
        <h2 className="text-xs font-semibold tracking-widest uppercase opacity-60 mb-2">
          계정
        </h2>
        <div className="space-y-3">
          <Field label="이름">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inp}
            />
          </Field>
          <Field label="이메일">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inp}
            />
          </Field>
          <Field label="비밀번호 (8자 이상)">
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inp}
            />
          </Field>
        </div>
      </section>

      {/* 통관 / 배송 */}
      <section>
        <h2 className="text-xs font-semibold tracking-widest uppercase opacity-60 mb-2">
          통관 · 배송정보
        </h2>
        <p className="text-[11px] opacity-60 mb-2 leading-relaxed">
          해외 구매대행 통관에 필요한 정보입니다. 정확히 입력해 주세요.
        </p>

        <div className="space-y-3">
          <Field label="개인통관고유부호">
            <input
              required
              value={customsIdNo}
              onChange={(e) => setCustomsIdNo(e.target.value.toUpperCase())}
              placeholder="P012345678901"
              maxLength={13}
              pattern="^P\d{12}$"
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

          <Field label="수령인 (선택, 미입력 시 이름과 동일)">
            <input
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder={name || "수령인 이름"}
              className={inp}
            />
          </Field>

          <Field label="휴대폰">
            <input
              required
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
                required
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
                required
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
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {info && <p className="text-sm text-green-700">{info}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-lg bg-[var(--primary)] text-white text-sm font-semibold disabled:opacity-50"
      >
        {loading ? "가입 중..." : "회원가입"}
      </button>
    </form>
  );
}

const inp =
  "w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs opacity-60 mb-1">{label}</span>
      {children}
    </label>
  );
}
