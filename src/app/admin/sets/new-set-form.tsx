"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewSetForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");
  const [nameJa, setNameJa] = useState("");
  const [region, setRegion] = useState<"en" | "jp" | "kr">("kr");
  const [series, setSeries] = useState("");
  const [printedTotal, setPrintedTotal] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [boxPrice, setBoxPrice] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) {
      setPreview(URL.createObjectURL(f));
      setLogoUrl("");
    } else {
      setPreview(null);
    }
  }

  function validate(): string[] {
    const errs: string[] = [];
    if (!name.trim()) errs.push("세트 이름 필수");
    if (!["en", "jp", "kr"].includes(region)) errs.push("에디션 필요");
    if (printedTotal && !/^\d{1,4}$/.test(printedTotal)) errs.push("카드 수는 숫자만");
    if (boxPrice && !/^\d{1,9}$/.test(boxPrice)) errs.push("박스 가격은 숫자만 (엔화)");
    if (releaseDate && !/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) errs.push("발매일은 YYYY-MM-DD");
    if (file && file.size > 5 * 1024 * 1024) errs.push("이미지 5MB 이하");
    if (file && !["image/png", "image/jpeg", "image/webp"].includes(file.type)) errs.push("PNG/JPEG/WEBP만");
    if (logoUrl && file) errs.push("파일 또는 URL 하나만");
    if (logoUrl && !/^https?:\/\//.test(logoUrl)) errs.push("URL은 http(s)://");
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
    form.append("name", name.trim());
    form.append("region", region);
    if (nameJa.trim()) form.append("name_ja", nameJa.trim());
    if (series.trim()) form.append("series", series.trim());
    if (printedTotal.trim()) form.append("printed_total", printedTotal.trim());
    if (releaseDate.trim()) form.append("release_date", releaseDate.trim());
    if (boxPrice.trim()) form.append("snkrdunk_box_price", boxPrice.trim());
    if (file) form.append("logo_file", file);
    else if (logoUrl.trim()) form.append("logo_url", logoUrl.trim());

    try {
      const resp = await fetch("/api/admin/sets", { method: "POST", body: form });
      const json = await resp.json();
      if (!resp.ok) {
        setErrors([json.error ?? "추가 실패"]);
      } else {
        // 폼 리셋 + 페이지 새로고침 (목록에 반영)
        setName(""); setNameJa(""); setSeries(""); setPrintedTotal("");
        setReleaseDate(""); setBoxPrice(""); setFile(null); setPreview(null); setLogoUrl("");
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
        className="mb-4 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90"
      >
        + 새 세트 추가
      </button>
    );
  }

  return (
    <div className="mb-6 rounded-lg border border-[var(--border)] p-4 bg-[var(--card-bg)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">새 세트 추가</h3>
        <button onClick={() => setOpen(false)} className="text-xs opacity-60 hover:opacity-100">닫기</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4 items-start">
        <div className="aspect-[3/2] rounded-lg border border-[var(--border)] bg-gray-50 flex items-center justify-center overflow-hidden">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="preview" className="max-w-full max-h-full object-contain" />
          ) : logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="preview" className="max-w-full max-h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <span className="text-xs opacity-40">미리보기</span>
          )}
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="세트 이름 *">
              <input value={name} onChange={(e) => setName(e.target.value)} className={inp} placeholder="예: 메가 닌자스피너" />
            </Field>
            <Field label="에디션 *">
              <select value={region} onChange={(e) => setRegion(e.target.value as "en" | "jp" | "kr")} className={inp}>
                <option value="kr">한국판 (KR)</option>
                <option value="jp">일본판 (JP)</option>
                <option value="en">북미판 (EN)</option>
              </select>
            </Field>
            <Field label="현지어 이름">
              <input value={nameJa} onChange={(e) => setNameJa(e.target.value)} className={inp} placeholder="예: メガ ニンジャスピナー" />
            </Field>
            <Field label="시리즈">
              <input value={series} onChange={(e) => setSeries(e.target.value)} className={inp} placeholder="예: 스칼렛&바이올렛, MEGA" />
            </Field>
            <Field label="카드 수">
              <input value={printedTotal} onChange={(e) => setPrintedTotal(e.target.value)} className={inp} placeholder="예: 83" inputMode="numeric" />
            </Field>
            <Field label="발매일 (YYYY-MM-DD)">
              <input value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} className={inp} placeholder="2026-01-15" />
            </Field>
            <Field label="박스 가격 (엔화, 선택)">
              <input value={boxPrice} onChange={(e) => setBoxPrice(e.target.value)} className={inp} placeholder="예: 18000" inputMode="numeric" />
            </Field>
          </div>

          <Field label="로고 파일 업로드 (PNG/JPEG/WEBP, 5MB 이하)">
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={pickFile} className="text-sm" />
          </Field>
          <p className="text-xs opacity-50 text-center">— 또는 —</p>
          <Field label="로고 URL">
            <input
              value={logoUrl}
              onChange={(e) => { setLogoUrl(e.target.value); setFile(null); setPreview(null); }}
              className={inp}
              placeholder="https://..."
            />
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
        <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-[var(--border)]">취소</button>
        <button
          onClick={submit}
          disabled={submitting}
          className="px-4 py-2 text-sm rounded-lg bg-[var(--primary)] text-white disabled:opacity-50"
        >
          {submitting ? "저장 중..." : "세트 추가"}
        </button>
      </div>
    </div>
  );
}

const inp = "w-full px-3 py-2 rounded border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs opacity-60 mb-1">{label}</span>
      {children}
    </label>
  );
}
