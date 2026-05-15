"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  threadId: string;
  role: "customer" | "admin";
}

export default function MessageInput({ threadId, role }: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const t = body.trim();
    if (!t) return;
    setSending(true);
    const res = await fetch(`/api/support/${threadId}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: t, sender_role: role }),
    });
    setSending(false);
    if (res.ok) {
      setBody("");
      router.refresh();
    }
  }

  return (
    <form
      onSubmit={send}
      className="sticky bottom-16 md:bottom-0 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-2 flex gap-2 shadow-sm"
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send(e);
          }
        }}
        placeholder={role === "admin" ? "답변 입력... (Enter 전송, Shift+Enter 줄바꿈)" : "메시지 입력... (Enter 전송)"}
        rows={1}
        className="flex-1 resize-none px-3 py-2 text-sm bg-transparent outline-none"
      />
      <button
        type="submit"
        disabled={sending || !body.trim()}
        className="px-4 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold disabled:opacity-40 self-stretch"
      >
        전송
      </button>
    </form>
  );
}
