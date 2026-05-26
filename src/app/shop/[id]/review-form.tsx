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
const RATING_LABEL: Record<number, string> = {
  1: "별로예요",
  2: "그저 그래요",
  3: "괜찮아요",
  4: "좋아요",
  5: "최고예요",
};

export default function ReviewForm({ listingId, listingSlug, existing }: Props) {
  const [rating, setRating] = useState<number>(existing?.rating ?? 5);
  const [hover, setHover] = useState<number | null>(null);
  const [body, setBody] = useState<string>(existing?.body ?? "");
  const [photos, setPhotos] = useState<string[]>(existing?.photoUrls ?? []);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

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
    setOk(false);
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
      setOk(true);
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
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 space-y-4 h-full flex flex-col"
    >
      <div>
        <p className="text-sm font-bold tracking-tight">
          {existing ? "내 후기 수정" : "후기 작성"}
        </p>
        <p className="text-xs opacity-50 mt-0.5">
          {existing ? "수정하고 저장하면 바로 반영돼요" : "다른 구매자에게 도움이 되는 솔직한 후기를 남겨주세요"}
        </p>
      </div>

      {/* 별점 */}
      <div className="rounded-xl bg-[var(--surface)] px-4 py-3">
        <div className="flex items-center gap-1" onMouseLeave={() => setHover(null)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n}점`}
              onMouseEnter={() => setHover(n)}
              onClick={() => setRating(n)}
              className="text-3xl leading-none tracking-tighter transition-transform hover:scale-110"
            >
              <span className={n <= display ? "text-yellow-500" : "text-[var(--border)]"}>★</span>
            </button>
          ))}
          <span className="ml-3 text-sm font-bold tabular-nums">{display}.0</span>
          <span className="text-xs opacity-60 ml-1">{RATING_LABEL[display]}</span>
        </div>
      </div>

      {/* 텍스트 */}
      <div className="flex-1">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="상품의 품질, 배송, 포장 등에 대한 솔직한 의견을 남겨주세요"
          rows={5}
          maxLength={4000}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 text-sm focus:border-[var(--primary)] focus:outline-none resize-y leading-relaxed"
        />
        <p className="text-[11px] opacity-50 text-right mt-1 tabular-nums">{body.length} / 4000</p>
      </div>

      {/* 사진 */}
      <div>
        <p className="text-xs font-semibold opacity-70 mb-2">사진 ({photos.length}/{MAX_PHOTOS})</p>
        <div className="flex flex-wrap gap-2">
          {photos.map((url) => (
            <div
              key={url}
              className="relative w-20 h-20 rounded-xl overflow-hidden border border-[var(--border)] group bg-white"
            >
              <Image src={url} alt="" fill className="object-cover" sizes="80px" />
              <button
                type="button"
                onClick={() => setPhotos((p) => p.filter((u) => u !== url))}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white text-xs leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="삭제"
              >
                ×
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <label className="w-20 h-20 rounded-xl border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center text-xs opacity-60 hover:opacity-100 hover:border-[var(--primary)] cursor-pointer transition-colors">
              <span className="text-xl leading-none">📷</span>
              <span className="text-[10px] mt-1">{uploading ? "업로드 중" : "추가"}</span>
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
      </div>

      {err && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {err}
        </p>
      )}
      {ok && (
        <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          후기가 등록됐어요 — 감사합니다 🙌
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || uploading}
        className="w-full py-3 rounded-full bg-[var(--primary)] text-white text-sm font-bold disabled:opacity-50 hover:opacity-90 transition-opacity"
      >
        {submitting ? "저장 중…" : existing ? "수정 저장" : "후기 등록"}
      </button>
    </form>
  );
}
