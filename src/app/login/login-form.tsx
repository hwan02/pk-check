"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

interface Props {
  redirectTo?: string;
}

export default function LoginForm({ redirectTo = "/" }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  async function signInWithGoogle() {
    const supabase = createClient();
    const next = encodeURIComponent(redirectTo);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
      },
    });
  }

  return (
    <div className="space-y-4">
      {/* Google */}
      <button
        onClick={signInWithGoogle}
        type="button"
        className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-sm font-medium hover:bg-[var(--surface)] transition cursor-pointer"
      >
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        Google로 로그인
      </button>

      <div className="flex items-center gap-3">
        <hr className="flex-1 border-[var(--border)]" />
        <span className="text-xs opacity-40">또는</span>
        <hr className="flex-1 border-[var(--border)]" />
      </div>

      {/* Email/Password */}
      <form onSubmit={submit} className="space-y-3">
        <Field label="이메일">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inp}
          />
        </Field>
        <Field label="비밀번호">
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inp}
          />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium disabled:opacity-50 cursor-pointer"
        >
          {loading ? "로그인 중..." : "이메일로 로그인"}
        </button>
      </form>
    </div>
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
