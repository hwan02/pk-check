"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  defaultOrderId?: string;
  compact?: boolean;
}

export default function NewInquiry({ defaultOrderId, compact }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(!!defaultOrderId);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      setError("제목과 내용을 입력하세요.");
      return;
    }
    setSending(true);
    setError("");
    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        subject: subject.trim(),
        body: body.trim(),
        order_id: defaultOrderId ?? null,
      }),
    });
    setSending(false);
    if (res.ok) {
      const d = await res.json();
      router.push(`/support/${d.id}`);
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "전송 실패");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={
          compact
            ? "text-xs px-4 py-2 rounded-full bg-[var(--primary)] text-white font-semibold"
            : "w-full py-3 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold"
        }
      >
        새 문의 작성
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 space-y-3"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">
          {defaultOrderId ? "이 주문 문의" : "새 문의"}
        </p>
        {!defaultOrderId && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs opacity-50 hover:opacity-100"
          >
            취소
          </button>
        )}
      </div>
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="제목 (예: 배송 지연 문의)"
        maxLength={120}
        className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] focus:border-[var(--primary)] outline-none"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="내용을 자세히 작성해 주세요."
        rows={5}
        className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] focus:border-[var(--primary)] outline-none resize-y"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={sending}
        className="w-full py-2.5 rounded-lg bg-[var(--primary)] text-white text-sm font-semibold disabled:opacity-50"
      >
        {sending ? "전송 중..." : "문의 보내기"}
      </button>
    </form>
  );
}
