"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Listing } from "@/lib/shop";

interface Props {
  listing: Listing;
}

export default function EditListingForm({ listing }: Props) {
  const router = useRouter();

  const [title, setTitle] = useState(listing.title);
  const [titleEn, setTitleEn] = useState(listing.title_en ?? "");
  const [category, setCategory] = useState<"pokemon" | "onepiece">(listing.category);
  const [language, setLanguage] = useState(listing.language ?? "jp");
  const [condition, setCondition] = useState(listing.condition ?? "near-mint");
  const [priceUsd, setPriceUsd] = useState(String(listing.price_usd));
  const [stock, setStock] = useState(String(listing.stock));
  const [description, setDescription] = useState(listing.description ?? "");
  const [descriptionEn, setDescriptionEn] = useState(listing.description_en ?? "");
  const [videoUrl, setVideoUrl] = useState(listing.video_url ?? "");
  const [isActive, setIsActive] = useState(listing.is_active);
  const [imageUrl, setImageUrl] = useState(listing.image_url);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function uploadImage() {
    if (!file) return;
    setUploadingImage(true);
    setMsg(null);
    const form = new FormData();
    form.append("image", file);
    const resp = await fetch(`/api/admin/listings/${listing.id}/image`, {
      method: "POST",
      body: form,
    });
    setUploadingImage(false);
    if (resp.ok) {
      const json = await resp.json();
      setImageUrl(json.image_url);
      setFile(null);
      setPreview(null);
      setMsg({ type: "ok", text: "이미지가 교체되었습니다." });
      router.refresh();
    } else {
      const json = await resp.json().catch(() => ({}));
      setMsg({ type: "err", text: json.error ?? "이미지 업로드 실패" });
    }
  }

  async function save() {
    if (!title.trim()) {
      setMsg({ type: "err", text: "제목을 입력하세요." });
      return;
    }
    const price = parseFloat(priceUsd);
    const stk = parseInt(stock, 10);
    if (!Number.isFinite(price) || price < 0) {
      setMsg({ type: "err", text: "가격이 잘못되었습니다." });
      return;
    }
    if (!Number.isInteger(stk) || stk < 0) {
      setMsg({ type: "err", text: "재고가 잘못되었습니다." });
      return;
    }
    setSaving(true);
    setMsg(null);
    const resp = await fetch(`/api/admin/listings/${listing.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        title_en: titleEn.trim() || null,
        category,
        language,
        condition,
        price_usd: price,
        stock: stk,
        description: description.trim() || null,
        description_en: descriptionEn.trim() || null,
        video_url: videoUrl.trim() || null,
        is_active: isActive,
      }),
    });
    setSaving(false);
    if (resp.ok) {
      setMsg({ type: "ok", text: "저장되었습니다." });
      router.refresh();
    } else {
      const json = await resp.json().catch(() => ({}));
      setMsg({ type: "err", text: json.error ?? "저장 실패" });
    }
  }

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/shop/${listing.short_id ?? listing.id}`
      : `/shop/${listing.short_id ?? listing.id}`;

  return (
    <div className="space-y-5">
      {/* 간편 링크 */}
      {listing.short_id && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold tracking-widest uppercase opacity-60">
              간편 링크
            </p>
            <p className="text-sm font-mono mt-0.5 truncate">{shareUrl}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(shareUrl);
              setMsg({ type: "ok", text: "링크가 복사되었습니다." });
            }}
            className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface)] font-semibold shrink-0"
          >
            복사
          </button>
        </section>
      )}

      {/* 이미지 */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5">
        <h2 className="text-xs font-semibold tracking-widest uppercase opacity-60 mb-3">
          이미지
        </h2>
        <div className="flex items-start gap-4">
          <div className="w-32 h-32 relative shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="preview" className="w-full h-full object-contain" />
            ) : imageUrl ? (
              <Image src={imageUrl} alt={title} fill className="object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs opacity-40">
                없음
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={pickFile}
              className="text-xs"
            />
            <p className="text-[11px] opacity-50">PNG/JPEG/WEBP, 5MB 이하</p>
            {file && (
              <button
                type="button"
                onClick={uploadImage}
                disabled={uploadingImage}
                className="text-xs px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white font-semibold disabled:opacity-50"
              >
                {uploadingImage ? "교체 중..." : "이미지 교체"}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 기본 정보 */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 space-y-4">
        <h2 className="text-xs font-semibold tracking-widest uppercase opacity-60">
          기본 정보
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="제목 (한국어) *">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inp} />
          </Field>
          <Field label="제목 (영어)">
            <input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className={inp} />
          </Field>
          <Field label="카테고리 *">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as "pokemon" | "onepiece")}
              className={inp}
            >
              <option value="pokemon">포켓몬</option>
              <option value="onepiece">원피스</option>
            </select>
          </Field>
          <Field label="언어">
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className={inp}>
              <option value="jp">일본판 (JP)</option>
              <option value="en">북미판 (EN)</option>
              <option value="kr">한국판 (KR)</option>
            </select>
          </Field>
          <Field label="컨디션">
            <select value={condition} onChange={(e) => setCondition(e.target.value)} className={inp}>
              <option value="mint">M (Mint)</option>
              <option value="near-mint">NM (Near Mint)</option>
              <option value="excellent">EX (Excellent)</option>
              <option value="good">GD (Good)</option>
              <option value="played">PL (Played)</option>
            </select>
          </Field>
          <Field label="가격 (USD) *">
            <input
              value={priceUsd}
              onChange={(e) => setPriceUsd(e.target.value)}
              inputMode="decimal"
              className={inp}
            />
          </Field>
          <Field label="재고 *">
            <input
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              inputMode="numeric"
              className={inp}
            />
          </Field>
          <Field label="판매 상태">
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)]">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <span className="text-sm">활성 (쇼핑몰에 노출)</span>
            </label>
          </Field>
        </div>
      </section>

      {/* 상세 */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 space-y-3">
        <h2 className="text-xs font-semibold tracking-widest uppercase opacity-60">
          상세
        </h2>
        <Field label="설명 (한국어)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${inp} h-24 resize-y`}
          />
        </Field>
        <Field label="설명 (영어)">
          <textarea
            value={descriptionEn}
            onChange={(e) => setDescriptionEn(e.target.value)}
            className={`${inp} h-24 resize-y`}
          />
        </Field>
        <Field label="상품 영상 URL (YouTube/Vimeo 권장)">
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://youtu.be/..."
            className={inp}
          />
        </Field>
      </section>

      {msg && (
        <p
          className={`text-xs ${
            msg.type === "ok" ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {msg.text}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 py-3 rounded-lg bg-[var(--primary)] text-white text-sm font-semibold disabled:opacity-50"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
        <a
          href={`/shop/${listing.short_id ?? listing.id}`}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-3 rounded-lg border border-[var(--border)] text-sm font-semibold hover:bg-[var(--surface)]"
        >
          상품 보기 ↗
        </a>
      </div>
    </div>
  );
}

const inp =
  "w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] focus:border-[var(--primary)] outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold opacity-60 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
