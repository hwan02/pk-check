"use client";

import { useState } from "react";

interface Set {
  id: string;
  name: string;
  region: string | null;
  logo_url: string | null;
  symbol_url: string | null;
}

export default function SetLogoEditor({ set }: { set: Set }) {
  const [logoUrl, setLogoUrl] = useState(set.logo_url ?? "");
  const [urlInput, setUrlInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      const form = new FormData();
      form.append("setId", set.id);
      if (file) form.append("file", file);
      else form.append("url", urlInput);
      const resp = await fetch("/api/admin/set-logo", { method: "POST", body: form });
      const json = await resp.json();
      if (!resp.ok) {
        setMsg(json.error ?? "에러");
      } else {
        setLogoUrl(json.logoUrl ?? "");
        setFile(null);
        setUrlInput("");
        setMsg("저장됨");
        setTimeout(() => setMsg(""), 1500);
      }
    } catch (e) {
      setMsg("실패: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    if (!confirm("로고를 지울까요?")) return;
    setBusy(true);
    const form = new FormData();
    form.append("setId", set.id);
    const resp = await fetch("/api/admin/set-logo", { method: "POST", body: form });
    if (resp.ok) {
      setLogoUrl("");
      setUrlInput("");
      setFile(null);
      setMsg("삭제됨");
      setTimeout(() => setMsg(""), 1500);
    }
    setBusy(false);
  }

  const regionBadge = set.region === "kr" ? "bg-blue-500" : set.region === "jp" ? "bg-red-500" : "bg-gray-500";

  return (
    <div className="flex items-start gap-3 rounded-lg border border-[var(--border)] p-3 bg-[var(--card-bg)]">
      <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center bg-gray-50 rounded">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={set.name} className="max-h-20 max-w-full object-contain" />
        ) : set.symbol_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={set.symbol_url} alt={set.name} className="max-h-12 max-w-full object-contain opacity-50" />
        ) : (
          <span className="text-[10px] opacity-40">No Image</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[10px] px-1.5 py-0.5 rounded text-white ${regionBadge}`}>
            {(set.region ?? "en").toUpperCase()}
          </span>
          <span className="text-sm font-medium truncate">{set.name}</span>
          <span className="text-xs opacity-40">{set.id}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="이미지 URL 붙여넣기"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            disabled={busy || file !== null}
            className="flex-1 min-w-[180px] px-2 py-1 text-xs rounded border border-[var(--border)] bg-[var(--background)]"
          />
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={busy}
            className="text-xs"
          />
          <button
            onClick={save}
            disabled={busy || (!file && !urlInput)}
            className="px-3 py-1 text-xs rounded bg-[var(--primary)] text-white disabled:opacity-40"
          >
            저장
          </button>
          {logoUrl && (
            <button onClick={clear} disabled={busy} className="px-3 py-1 text-xs rounded border border-[var(--border)]">
              지우기
            </button>
          )}
          {msg && <span className="text-xs opacity-60">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
