"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatKRW, MARKET_CATEGORY_LABEL, type MarketCard } from "@/lib/market";

export default function NewArticleForm({
  marketCards,
}: {
  marketCards: MarketCard[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [slug, setSlug] = useState("");
  const [bodyMd, setBodyMd] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [picks, setPicks] = useState<string[]>([]);
  const [pickFilter, setPickFilter] = useState<"all" | "pokemon" | "onepiece">("all");

  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function pickCover(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setCover(f);
    setCoverPreview(f ? URL.createObjectURL(f) : null);
  }

  function togglePick(id: string) {
    setPicks((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  function movePick(id: string, dir: -1 | 1) {
    setPicks((cur) => {
      const idx = cur.indexOf(id);
      if (idx < 0) return cur;
      const next = idx + dir;
      if (next < 0 || next >= cur.length) return cur;
      const arr = [...cur];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  }

  function reset() {
    setTitle(""); setSubtitle(""); setSlug(""); setBodyMd("");
    setIsPublished(true); setCover(null); setCoverPreview(null);
    setPicks([]); setErrors([]);
  }

  async function submit() {
    const errs: string[] = [];
    if (!title.trim()) errs.push("제목 필수");
    if (!bodyMd.trim()) errs.push("본문 필수");
    if (cover && cover.size > 5 * 1024 * 1024) errs.push("커버 5MB 이하");
    if (errs.length > 0) { setErrors(errs); return; }
    setErrors([]);
    setSubmitting(true);

    const form = new FormData();
    form.append("title", title.trim());
    if (subtitle.trim()) form.append("subtitle", subtitle.trim());
    if (slug.trim()) form.append("slug", slug.trim());
    form.append("body_md", bodyMd);
    form.append("is_published", String(isPublished));
    form.append("market_card_ids", picks.join(","));
    if (cover) form.append("cover", cover);

    try {
      const resp = await fetch("/api/admin/articles", { method: "POST", body: form });
      const json = await resp.json();
      if (!resp.ok) {
        setErrors([json.error ?? "등록 실패"]);
      } else {
        if (json.pick_warning) setErrors([`경고: ${json.pick_warning}`]);
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
        + 새 매거진 글 등록
      </button>
    );
  }

  const filtered = marketCards.filter((c) => pickFilter === "all" || c.category === pickFilter);
  const pickedCards = picks
    .map((id) => marketCards.find((c) => c.id === id))
    .filter((c): c is MarketCard => !!c);

  return (
    <div className="rounded-lg border border-[var(--border)] p-4 bg-[var(--card-bg)] space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">새 매거진 글 등록</h3>
        <button onClick={() => setOpen(false)} className="text-xs opacity-60 hover:opacity-100">
          닫기
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="제목 *">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inp} placeholder="이번 주 시세 픽" />
        </Field>
        <Field label="부제 (선택)">
          <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className={inp} placeholder="2026년 5월 셋째 주 핫 카드" />
        </Field>
        <Field label="슬러그 (URL, 비우면 제목에서 자동 생성)">
          <input value={slug} onChange={(e) => setSlug(e.target.value)} className={inp} placeholder="weekly-pick-2026-05-3" />
        </Field>
        <Field label="공개 여부">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
            <span>{isPublished ? "공개" : "비공개(드래프트)"}</span>
          </label>
        </Field>
      </div>

      <Field label="커버 이미지 (PNG/JPEG/WEBP, 5MB 이하)">
        <div className="flex items-start gap-3">
          <div className="w-32 h-20 rounded-lg bg-gray-50 border border-[var(--border)] overflow-hidden flex items-center justify-center">
            {coverPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverPreview} alt="cover" className="max-w-full max-h-full object-contain" />
            ) : (
              <span className="text-[10px] opacity-40">미리보기</span>
            )}
          </div>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={pickCover} className="text-sm" />
        </div>
      </Field>

      <Field label="본문 (Markdown)">
        <textarea
          value={bodyMd}
          onChange={(e) => setBodyMd(e.target.value)}
          className={`${inp} h-56 font-mono text-xs leading-relaxed resize-y`}
          placeholder={"## 이번 주 트렌드\n\n포켓몬 SV 시세 정리...\n\n- 메가리자몽Y SAR: 12만원\n- 피카츄 ex: 5만원"}
        />
      </Field>

      <div>
        <p className="text-xs opacity-60 mb-2">이번 주 픽 카드 선택 (선택 순서대로 본문 아래 노출)</p>

        {/* 선택된 카드 */}
        {pickedCards.length > 0 && (
          <div className="mb-3 rounded-lg border border-[var(--primary)]/40 bg-[var(--primary)]/5 p-2">
            <p className="text-[10px] opacity-60 mb-2">선택 {pickedCards.length}장</p>
            <ul className="flex flex-wrap gap-2">
              {pickedCards.map((c, i) => (
                <li key={c.id} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white border border-[var(--border)] text-xs">
                  <span className="opacity-50">{i + 1}.</span>
                  <span className="truncate max-w-[140px]">{c.name}</span>
                  <button type="button" onClick={() => movePick(c.id, -1)} className="opacity-50 hover:opacity-100">↑</button>
                  <button type="button" onClick={() => movePick(c.id, 1)} className="opacity-50 hover:opacity-100">↓</button>
                  <button type="button" onClick={() => togglePick(c.id)} className="opacity-60 hover:opacity-100 ml-1">×</button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 필터 */}
        <div className="flex gap-1 mb-2">
          {(["all", "pokemon", "onepiece"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setPickFilter(c)}
              className={`text-[11px] px-2 py-1 rounded ${pickFilter === c ? "bg-[var(--primary)] text-white" : "opacity-60 hover:opacity-100 border border-[var(--border)]"}`}
            >
              {c === "all" ? "전체" : MARKET_CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>

        {/* 카드 목록 */}
        {filtered.length === 0 ? (
          <p className="text-xs opacity-50 py-4 text-center border border-dashed border-[var(--border)] rounded">
            먼저 /admin/market 에서 시세 카드를 등록하세요.
          </p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-72 overflow-y-auto p-1">
            {filtered.map((c) => {
              const on = picks.includes(c.id);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => togglePick(c.id)}
                    className={`w-full flex items-center gap-2 p-2 rounded-lg border text-left transition ${
                      on
                        ? "border-[var(--primary)] bg-[var(--primary)]/10"
                        : "border-[var(--border)] hover:bg-[var(--surface)]"
                    }`}
                  >
                    <div className="w-10 h-10 relative shrink-0 rounded bg-white border border-[var(--border)] overflow-hidden">
                      {c.image_url ? (
                        <Image src={c.image_url} alt={c.name} fill sizes="40px" className="object-contain" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium truncate">{c.name}</p>
                      <p className="text-[10px] opacity-60">{formatKRW(c.price_krw)}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          <ul className="list-disc list-inside">
            {errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button onClick={() => { reset(); setOpen(false); }} className="px-4 py-2 text-sm rounded-lg border border-[var(--border)]">
          취소
        </button>
        <button onClick={submit} disabled={submitting} className="px-4 py-2 text-sm rounded-lg bg-[var(--primary)] text-white disabled:opacity-50">
          {submitting ? "저장 중..." : "등록"}
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
