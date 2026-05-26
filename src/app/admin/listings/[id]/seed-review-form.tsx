"use client";

import { useState } from "react";
import Image from "next/image";
import { createSeedReview } from "./admin-review-actions";

interface Props {
  listingId: string;
}

export default function SeedReviewForm({ listingId }: Props) {
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [label, setLabel] = useState("");
  const [verified, setVerified] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function uploadPhotos(files: FileList) {
    if (photos.length + files.length > 5) { setErr("사진은 최대 5장"); return; }
    setUploading(true);
    setErr(null);
    try {
      const form = new FormData();
      for (const f of Array.from(files)) form.append("photos", f);
      const resp = await fetch("/api/reviews/upload", { method: "POST", body: form });
      const json = (await resp.json()) as { urls?: string[]; error?: string };
      if (!resp.ok) throw new Error(json.error ?? "업로드 실패");
      setPhotos((p) => [...p, ...(json.urls ?? [])]);
    } catch (e) { setErr((e as Error).message); }
    finally { setUploading(false); }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setOk(false);
    try {
      const r = await createSeedReview({
        listingId,
        rating,
        body,
        photoUrls: photos,
        authorLabel: label,
        isVerified: verified,
      });
      if (!r.ok) throw new Error(r.error ?? "실패");
      setOk(true);
      setBody(""); setLabel(""); setPhotos([]); setRating(5);
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 space-y-3">
      <p className="text-sm font-semibold">시드 후기 등록</p>

      <div>
        <label className="text-xs opacity-70">표시명 (예: 김O진)</label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full mt-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm"
          required
        />
      </div>

      <div className="flex items-center gap-1">
        {[1,2,3,4,5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} className="text-2xl leading-none">
            <span className={n <= rating ? "text-yellow-500" : "text-[var(--border)]"}>★</span>
          </button>
        ))}
        <span className="ml-2 text-xs opacity-60">{rating}점</span>
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="후기 본문"
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5 text-sm resize-y"
      />

      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} />
        구매 인증 배지
      </label>

      <div>
        <div className="flex flex-wrap gap-2 mb-2">
          {photos.map((url) => (
            <div key={url} className="relative w-16 h-16 rounded-lg overflow-hidden border border-[var(--border)]">
              <Image src={url} alt="" fill className="object-cover" sizes="64px" />
              <button type="button" onClick={() => setPhotos((p) => p.filter((u) => u !== url))} className="absolute top-0 right-0 w-5 h-5 bg-black/70 text-white text-xs leading-5 text-center">×</button>
            </div>
          ))}
          {photos.length < 5 && (
            <label className="w-16 h-16 rounded-lg border border-dashed border-[var(--border)] flex items-center justify-center text-2xl opacity-60 hover:opacity-100 cursor-pointer">
              +
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => e.target.files && uploadPhotos(e.target.files)} className="hidden" disabled={uploading} />
            </label>
          )}
        </div>
        {uploading && <p className="text-xs opacity-60">업로드 중…</p>}
      </div>

      {err && <p className="text-xs text-red-600">{err}</p>}
      {ok && <p className="text-xs text-emerald-700">등록됐어요</p>}

      <button type="submit" disabled={busy || uploading} className="w-full py-2 rounded-full bg-[var(--primary)] text-white text-sm font-semibold disabled:opacity-50">
        {busy ? "저장 중…" : "시드 후기 등록"}
      </button>
    </form>
  );
}
