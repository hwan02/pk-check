"use client";

import { useState } from "react";
import type { Provider } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/browser";

interface ProviderConfig {
  id: Provider;
  label: string;
  bg: string;
  color: string;
  border?: string;
  icon: React.ReactNode;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: "google",
    label: "Continue with Google",
    bg: "#ffffff",
    color: "#1f1f1f",
    border: "#d8d5e4",
    icon: <GoogleIcon />,
  },
];

export default function OAuthButtons({ next = "/" }: { next?: string }) {
  const [loading, setLoading] = useState<Provider | null>(null);
  const [error, setError] = useState("");

  async function go(p: Provider) {
    setLoading(p);
    setError("");
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: p,
      options: { redirectTo },
    });
    if (error) {
      setLoading(null);
      setError(error.message);
    }
  }

  return (
    <div className="space-y-2">
      {PROVIDERS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => go(p.id)}
          disabled={loading !== null}
          className="w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 transition"
          style={{
            background: p.bg,
            color: p.color,
            border: p.border ? `1px solid ${p.border}` : "1px solid transparent",
          }}
        >
          {p.icon}
          <span>{loading === p.id ? "이동 중..." : p.label}</span>
        </button>
      ))}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 7.9-21l5.7-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7A20 20 0 0 0 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.3l-6.3-5.3A12 12 0 0 1 12.7 28l-6.6 5.1A20 20 0 0 0 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.3 5.3c4.4-4 7.7-10.1 7.7-15c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}

