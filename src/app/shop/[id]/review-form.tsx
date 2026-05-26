"use client";

import { useState } from "react";
import Image from "next/image";
import { submitReview } from "./review-actions";

interface Props {
  listingId: string;
  listingSlug: string;
  existing?: {
    rating: number;
    body: string;
    photoUrls: string[];
  } | null;
}

const MAX_PHOTOS = 5;

export default function ReviewForm({ listingId, listingSlug, existing }: Props) {
  const [rating, setRating] = useState<number>(existing?.rating ?? 5);
  const [hover, setHover] = useState<number | null>(null);
  const [body, setBody] = useState<string>(existing?.body ?? "");
  const [photos, setPhotos] = useState<string[]>(existing?.photoUrls ?? []);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function uploadPhotos(files: FileList) {
    if (photos.length + files.length > MAX_PHOTOS) {
      setErr(`사진은 최대 ${MAX_PHOTOS}장이에요`);
      return;
    }
    setUploading(true);
    setErr(null);
    try {
      const form = new FormData();
      for (const f of Array.from(files)) form.append("photos", f);
      const resp = await fetch("/api/reviews/upload", { method: "POST", body: form });
      const json = (await resp.json()) as { urls?: string[]; error?: string };
      if (!resp.ok) throw new Error(json.error ?? "업로드 실패");
      setPhotos((p) => [...p, ...(json.urls ?? [])]);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      const r = await submitReview({
        listingId,
        listingSlug,
        rating,
        body,
        photoUrls: photos,
      });
      if (!r.ok) throw new Error(r.error ?? "실패");
      // 폼 reset (수정 시엔 그대로 둠)
      if (!existing) {
        setBody("");
        setPhotos([]);
        setRating(5);
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const display = hover ?? rating;

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 space-y-3">
      <p className="text-sm font-semibold">{existing ? "내 후기 수정" : "후기 작성"}</p>

      {/* 별점 */}
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n}점`}
            onMouseEnter={() => setHover(n)}
            onClick={() => setRating(n)}
            className="text-2xl leading-none"
          >
            <span className={n <= display ? "text-yellow-500" : "text-[var(--border)]"}>★</span>
          </button>
        ))}
        <span className="ml-2 text-xs opacity-60">{rating}점</span>
      </div>

      {/* 텍스트 */}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="상품에 대한 솔직한 후기를 남겨주세요"
        rows={4}
        maxLength={4000}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5 text-sm focus:border-[var(--primary)] focus:outline-none resize-y"
      />

      {/* 사진 */}
      <div>
        <div className="flex flex-wrap gap-2 mb-2">
          {photos.map((url) => (
            <div key={url} className="relative w-16 h-16 rounded-lg overflow-hidden border border-[var(--border)]">
              <Image src={url} alt="" fill className="object-cover" sizes="64px" />
              <button
                type="button"
                onClick={() => setPhotos((p) => p.filter((u) => u !== url))}
                className="absolute top-0 right-0 w-5 h-5 bg-black/70 text-white text-xs leading-5 text-center"
                aria-label="삭제"
              >
                ×
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <label className="w-16 h-16 rounded-lg border border-dashed border-[var(--border)] flex items-center justify-center text-2xl opacity-60 hover:opacity-100 cursor-pointer">
              +
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => e.target.files && uploadPhotos(e.target.files)}
                className="hidden"
                disabled={uploading}
              />
            </label>
          )}
        </div>
        {uploading && <p className="text-xs opacity-60">업로드 중…</p>}
      </div>

      {err && <p className="text-xs text-red-600">{err}</p>}

      <button
        type="submit"
        disabled={submitting || uploading}
        className="w-full py-2.5 rounded-full bg-[var(--primary)] text-white text-sm font-semibold disabled:opacity-50"
      >
        {submitting ? "저장 중…" : existing ? "수정 저장" : "후기 등록"}
      </button>
    </form>
  );
}
