"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewListingForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [category, setCategory] = useState<"pokemon" | "onepiece">("pokemon");
  const [language, setLanguage] = useState("jp");
  const [condition, setCondition] = useState("near-mint");
  const [priceUsd, setPriceUsd] = useState("");
  const [stock, setStock] = useState("1");
  const [description, setDescription] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [gradingCompany, setGradingCompany] = useState("");
  const [gradingGrade, setGradingGrade] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  function reset() {
    setTitle(""); setTitleEn(""); setPriceUsd(""); setStock("1");
    setDescription(""); setDescriptionEn(""); setVideoUrl(""); setFile(null); setPreview(null);
    setErrors([]);
  }

  function validate(): string[] {
    const errs: string[] = [];
    if (!title.trim()) errs.push("제목 필수");
    if (!priceUsd || !/^\d+(\.\d{1,2})?$/.test(priceUsd)) errs.push("가격은 USD 숫자(최대 소수점 2자리)");
    if (!stock || !/^\d+$/.test(stock)) errs.push("재고는 정수");
    if (file) {
      if (file.size > 5 * 1024 * 1024) errs.push("이미지 5MB 이하");
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) errs.push("PNG/JPEG/WEBP만");
    }
    return errs;
  }

  async function submit() {
    const errs = validate();
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    setSubmitting(true);

    const form = new FormData();
    form.append("title", title.trim());
    if (titleEn.trim()) form.append("title_en", titleEn.trim());
    form.append("category", category);
    form.append("language", language);
    form.append("condition", condition);
    form.append("price_usd", priceUsd);
    form.append("stock", stock);
    if (description.trim()) form.append("description", description.trim());
    if (descriptionEn.trim()) form.append("description_en", descriptionEn.trim());
    if (gradingCompany) form.append("grading_company", gradingCompany);
    if (gradingGrade) form.append("grading_grade", gradingGrade);
    if (videoUrl.trim()) form.append("video_url", videoUrl.trim());
    if (file) form.append("image", file);

    try {
      const resp = await fetch("/api/admin/listings", { method: "POST", body: form });
      const json = await resp.json();
      if (!resp.ok) {
        setErrors([json.error ?? "등록 실패"]);
      } else {
        reset();
        setOpen(false);
        router.refresh();
      }
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "네트워크 오류"]);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90"
      >
        + 새 상품 등록
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border)] p-4 bg-[var(--card-bg)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">새 상품 등록</h3>
        <button onClick={() => setOpen(false)} className="text-xs opacity-60 hover:opacity-100">
          닫기
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4 items-start">
        <div className="aspect-square rounded-lg border border-[var(--border)] bg-gray-50 flex items-center justify-center overflow-hidden">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="preview" className="max-w-full max-h-full object-contain" />
          ) : (
            <span className="text-xs opacity-40">이미지 미리보기</span>
          )}
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="제목 (한국어) *">
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={inp} placeholder="피카츄 V SAR" />
            </Field>
            <Field label="제목 (영어)">
              <input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className={inp} placeholder="Pikachu V SAR" />
            </Field>
            <Field label="카테고리 *">
              <select value={category} onChange={(e) => setCategory(e.target.value as "pokemon" | "onepiece")} className={inp}>
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
            <Field label="그레이딩 업체">
              <select value={gradingCompany} onChange={(e) => setGradingCompany(e.target.value)} className={inp}>
                <option value="">없음 (미감정)</option>
                <option value="brg">BRG</option>
                <option value="psa">PSA</option>
                <option value="bgs">BGS</option>
                <option value="cgc">CGC</option>
                <option value="sgc">SGC</option>
                <option value="ace">ACE</option>
              </select>
            </Field>
            {gradingCompany && (
              <Field label="등급">
                <select value={gradingGrade} onChange={(e) => setGradingGrade(e.target.value)} className={inp}>
                  <option value="">선택</option>
                  <option value="10">10</option>
                  <option value="9.5">9.5</option>
                  <option value="9">9</option>
                  <option value="8.5">8.5</option>
                  <option value="8">8</option>
                  <option value="7.5">7.5</option>
                  <option value="7">7</option>
                  <option value="6">6 이하</option>
                </select>
              </Field>
            )}
            <Field label="가격 (USD) *">
              <input value={priceUsd} onChange={(e) => setPriceUsd(e.target.value)} className={inp} placeholder="99.99" inputMode="decimal" />
            </Field>
            <Field label="재고 *">
              <input value={stock} onChange={(e) => setStock(e.target.value)} className={inp} placeholder="1" inputMode="numeric" />
            </Field>
          </div>
          <Field label="설명 (한국어)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inp} h-20 resize-none`}
              placeholder="카드 상태, 특이사항 등"
            />
          </Field>
          <Field label="설명 (영어)">
            <textarea
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              className={`${inp} h-20 resize-none`}
              placeholder="Card condition, notes for overseas buyers"
            />
          </Field>
          <Field label="상품 영상 URL (YouTube/Vimeo 권장, 직접 mp4도 가능)">
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className={inp}
              placeholder="https://youtu.be/..."
            />
            <p className="text-[11px] opacity-50 mt-1">
              유튜브/비메오 사용 시 용량 부담 없이 임베드됩니다.
            </p>
          </Field>
          <Field label="이미지 (PNG/JPEG/WEBP, 5MB 이하)">
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={pickFile} className="text-sm" />
          </Field>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          <ul className="list-disc list-inside">
            {errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={() => { reset(); setOpen(false); }}
          className="px-4 py-2 text-sm rounded-lg border border-[var(--border)]"
        >
          취소
        </button>
        <button
          onClick={submit}
          disabled={submitting}
          className="px-4 py-2 text-sm rounded-lg bg-[var(--primary)] text-white disabled:opacity-50"
        >
          {submitting ? "저장 중..." : "상품 등록"}
        </button>
      </div>
    </div>
  );
}

const inp =
  "w-full px-3 py-2 rounded border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs opacity-60 mb-1">{label}</span>
      {children}
    </label>
  );
}