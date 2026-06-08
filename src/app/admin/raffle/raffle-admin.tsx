"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  type Raffle,
  type RaffleCategory,
  RAFFLE_CATEGORY_LABEL,
  formatJPY,
  formatKstDate,
  fromLocalInputValue,
  getRaffleStatus,
  toLocalInputValue,
} from "@/lib/raffles";

interface FormState {
  category: RaffleCategory;
  title: string;
  title_ja: string;
  image_url: string;
  apply_start_at: string;
  apply_end_at: string;
  draw_at: string;
  ship_note: string;
  amazon_url: string;
  price_jpy: string;
  notes: string;
  display_order: string;
  is_active: boolean;
}

const EMPTY: FormState = {
  category: "pokemon",
  title: "",
  title_ja: "",
  image_url: "",
  apply_start_at: "",
  apply_end_at: "",
  draw_at: "",
  ship_note: "",
  amazon_url: "",
  price_jpy: "",
  notes: "",
  display_order: "0",
  is_active: true,
};

function raffleToForm(r: Raffle): FormState {
  return {
    category: r.category,
    title: r.title,
    title_ja: r.title_ja ?? "",
    image_url: r.image_url ?? "",
    apply_start_at: toLocalInputValue(r.apply_start_at),
    apply_end_at: toLocalInputValue(r.apply_end_at),
    draw_at: toLocalInputValue(r.draw_at),
    ship_note: r.ship_note ?? "",
    amazon_url: r.amazon_url,
    price_jpy: r.price_jpy == null ? "" : String(r.price_jpy),
    notes: r.notes ?? "",
    display_order: String(r.display_order),
    is_active: r.is_active,
  };
}

function formToPayload(f: FormState) {
  return {
    category: f.category,
    title: f.title.trim(),
    title_ja: f.title_ja.trim() || null,
    image_url: f.image_url.trim() || null,
    apply_start_at: fromLocalInputValue(f.apply_start_at),
    apply_end_at: fromLocalInputValue(f.apply_end_at),
    draw_at: fromLocalInputValue(f.draw_at),
    ship_note: f.ship_note.trim() || null,
    amazon_url: f.amazon_url.trim(),
    price_jpy: f.price_jpy.trim() ? parseInt(f.price_jpy, 10) : null,
    notes: f.notes.trim() || null,
    display_order: parseInt(f.display_order, 10) || 0,
    is_active: f.is_active,
  };
}

export default function RaffleAdmin({ raffles }: { raffles: Raffle[] }) {
  const [editing, setEditing] = useState<Raffle | "new" | null>(null);

  return (
    <div>
      <div className="mb-4">
        <button
          onClick={() => setEditing("new")}
          className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90"
        >
          + 새 응모 등록
        </button>
      </div>

      {editing && (
        <RaffleEditor
          initial={editing === "new" ? EMPTY : raffleToForm(editing)}
          raffleId={editing === "new" ? null : editing.id}
          onClose={() => setEditing(null)}
        />
      )}

      <RaffleTable raffles={raffles} onEdit={(r) => setEditing(r)} />
    </div>
  );
}

function RaffleTable({
  raffles,
  onEdit,
}: {
  raffles: Raffle[];
  onEdit: (r: Raffle) => void;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function remove(id: string) {
    if (!confirm("정말 삭제하시겠습니까? (복구 불가)")) return;
    setBusyId(id);
    try {
      const resp = await fetch(`/api/admin/raffle/${id}`, { method: "DELETE" });
      const json = await resp.json();
      if (!resp.ok) alert(`삭제 실패: ${json.error}`);
      else router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(r: Raffle) {
    setBusyId(r.id);
    try {
      const resp = await fetch(`/api/admin/raffle/${r.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ is_active: !r.is_active }),
      });
      const json = await resp.json();
      if (!resp.ok) alert(`상태 변경 실패: ${json.error}`);
      else router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (raffles.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] py-12 text-center text-sm opacity-60">
        등록된 응모가 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
      <table className="w-full text-sm">
        <thead className="bg-[var(--surface)] text-xs uppercase tracking-wider opacity-70">
          <tr>
            <th className="text-left px-3 py-2 font-semibold">제목</th>
            <th className="text-left px-3 py-2 font-semibold">카테고리</th>
            <th className="text-left px-3 py-2 font-semibold">응모 기간</th>
            <th className="text-left px-3 py-2 font-semibold">추첨일</th>
            <th className="text-left px-3 py-2 font-semibold">상태</th>
            <th className="text-right px-3 py-2 font-semibold">정가</th>
            <th className="text-right px-3 py-2 font-semibold">순서</th>
            <th className="text-center px-3 py-2 font-semibold">노출</th>
            <th className="text-right px-3 py-2 font-semibold">관리</th>
          </tr>
        </thead>
        <tbody>
          {raffles.map((r) => {
            const s = getRaffleStatus(r);
            return (
              <tr
                key={r.id}
                className={`border-t border-[var(--border)] ${
                  r.is_active ? "" : "opacity-50"
                }`}
              >
                <td className="px-3 py-2 max-w-[280px]">
                  <div className="flex items-center gap-2">
                    {r.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.image_url}
                        alt=""
                        className="w-10 h-10 object-contain rounded bg-gray-50 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-gray-100 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{r.title}</p>
                      {r.title_ja && (
                        <p className="text-[11px] opacity-50 truncate">{r.title_ja}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-xs">{RAFFLE_CATEGORY_LABEL[r.category]}</td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">
                  {formatKstDate(r.apply_start_at)} ~ {formatKstDate(r.apply_end_at)}
                </td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">
                  {formatKstDate(r.draw_at)}
                </td>
                <td className="px-3 py-2">
                  <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-[var(--surface)]">
                    {s.label}
                  </span>
                  {s.hint && (
                    <span className="ml-1 text-[10px] opacity-60">{s.hint}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-xs">{formatJPY(r.price_jpy)}</td>
                <td className="px-3 py-2 text-right text-xs">{r.display_order}</td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => toggleActive(r)}
                    disabled={busyId === r.id}
                    className="text-[11px] underline opacity-70 hover:opacity-100 disabled:opacity-30"
                  >
                    {r.is_active ? "숨기기" : "복원"}
                  </button>
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button
                    onClick={() => onEdit(r)}
                    className="text-[11px] px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--surface)]"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => remove(r.id)}
                    disabled={busyId === r.id}
                    className="ml-1 text-[11px] px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-30"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RaffleEditor({
  initial,
  raffleId,
  onClose,
}: {
  initial: FormState;
  raffleId: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [f, setF] = useState<FormState>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    if (!f.title.trim()) return setError("제목 필수");
    if (!f.amazon_url.trim()) return setError("아마존 JP URL 필수");

    setSubmitting(true);
    setError(null);
    try {
      const url = raffleId ? `/api/admin/raffle/${raffleId}` : "/api/admin/raffle";
      const method = raffleId ? "PATCH" : "POST";
      const resp = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(formToPayload(f)),
      });
      const json = await resp.json();
      if (!resp.ok) {
        setError(json.error ?? "저장 실패");
        return;
      }
      onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "네트워크 오류");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] w-full max-w-3xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[var(--card-bg)] border-b border-[var(--border)] px-5 py-3 flex items-center justify-between z-10">
          <h2 className="text-sm font-bold">
            {raffleId ? "응모 수정" : "새 응모 등록"}
          </h2>
          <button onClick={onClose} className="text-xs opacity-60 hover:opacity-100">
            닫기
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4">
            <div className="aspect-square rounded-lg border border-[var(--border)] bg-gray-50 flex items-center justify-center overflow-hidden">
              {f.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={f.image_url}
                  alt="preview"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <span className="text-xs opacity-40">이미지 URL 입력</span>
              )}
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="카테고리 *">
                  <select
                    value={f.category}
                    onChange={(e) => set("category", e.target.value as RaffleCategory)}
                    className={inp}
                  >
                    <option value="pokemon">포켓몬</option>
                    <option value="onepiece">원피스</option>
                    <option value="other">기타</option>
                  </select>
                </Field>
                <Field label="노출 순서">
                  <input
                    value={f.display_order}
                    onChange={(e) =>
                      set("display_order", e.target.value.replace(/[^0-9]/g, ""))
                    }
                    className={inp}
                    inputMode="numeric"
                  />
                </Field>
              </div>

              <Field label="제목 (한국어) *">
                <input
                  value={f.title}
                  onChange={(e) => set("title", e.target.value)}
                  className={inp}
                  placeholder="예: 포켓몬 카드게임 스칼렛&바이올렛 '메가 브레이브'"
                />
              </Field>
              <Field label="제목 (일본어, 선택)">
                <input
                  value={f.title_ja}
                  onChange={(e) => set("title_ja", e.target.value)}
                  className={inp}
                  placeholder="ポケモンカードゲーム ..."
                />
              </Field>
              <Field label="이미지 (파일 업로드 또는 URL 입력)">
                <ImagePicker
                  value={f.image_url}
                  onChange={(v) => set("image_url", v)}
                />
              </Field>
              <Field label="아마존 JP URL *">
                <input
                  value={f.amazon_url}
                  onChange={(e) => set("amazon_url", e.target.value)}
                  className={inp}
                  placeholder="https://www.amazon.co.jp/dp/..."
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="응모 시작 (KST)">
                  <input
                    type="datetime-local"
                    value={f.apply_start_at}
                    onChange={(e) => set("apply_start_at", e.target.value)}
                    className={inp}
                  />
                </Field>
                <Field label="응모 마감 (KST)">
                  <input
                    type="datetime-local"
                    value={f.apply_end_at}
                    onChange={(e) => set("apply_end_at", e.target.value)}
                    className={inp}
                  />
                </Field>
                <Field label="추첨일 (KST)">
                  <input
                    type="datetime-local"
                    value={f.draw_at}
                    onChange={(e) => set("draw_at", e.target.value)}
                    className={inp}
                  />
                </Field>
                <Field label="정가 (엔, 선택)">
                  <input
                    value={f.price_jpy}
                    onChange={(e) =>
                      set("price_jpy", e.target.value.replace(/[^0-9]/g, ""))
                    }
                    className={inp}
                    inputMode="numeric"
                    placeholder="6600"
                  />
                </Field>
              </div>

              <Field label="발송 예정 안내 (자유 텍스트, 선택)">
                <input
                  value={f.ship_note}
                  onChange={(e) => set("ship_note", e.target.value)}
                  className={inp}
                  placeholder="2026년 7월 하순 발송 예정"
                />
              </Field>
              <Field label="메모 / 비고 (선택)">
                <textarea
                  value={f.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  className={`${inp} h-20 resize-none`}
                  placeholder="프라임 회원 한정 / 1인 1개 등"
                />
              </Field>
              <label className="inline-flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={f.is_active}
                  onChange={(e) => set("is_active", e.target.checked)}
                />
                노출
              </label>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-[var(--card-bg)] border-t border-[var(--border)] px-5 py-3 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-[var(--border)]"
          >
            취소
          </button>
          <button
            onClick={save}
            disabled={submitting}
            className="px-4 py-2 text-sm rounded-lg bg-[var(--primary)] text-white disabled:opacity-50"
          >
            {submitting ? "저장 중..." : raffleId ? "수정 저장" : "등록"}
          </button>
        </div>
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

function ImagePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErr("이미지 5MB 이하");
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setErr("PNG / JPEG / WEBP 만 가능");
      return;
    }
    setErr(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const resp = await fetch("/api/admin/raffle/upload-image", {
        method: "POST",
        body: form,
      });
      const json = await resp.json();
      if (!resp.ok) {
        setErr(`업로드 실패: ${json.error ?? resp.statusText}`);
        return;
      }
      onChange(json.url as string);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "네트워크 오류");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-stretch gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inp} flex-1`}
          placeholder="https://m.media-amazon.com/images/... 또는 ↓ 업로드"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="shrink-0 px-3 py-2 rounded border border-[var(--border)] hover:bg-[var(--surface)] text-xs font-semibold whitespace-nowrap disabled:opacity-50"
        >
          {uploading ? "업로드중..." : "📁 파일 업로드"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            disabled={uploading}
            className="shrink-0 px-3 py-2 rounded border border-[var(--border)] text-red-600 hover:bg-red-50 text-xs font-semibold disabled:opacity-50"
          >
            제거
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
      {err && <p className="text-[11px] text-red-600">{err}</p>}
      <p className="text-[10px] opacity-50">
        파일 직접 업로드 또는 외부 URL (예: m.media-amazon.com) 둘 다 가능. 최대 5MB.
      </p>
    </div>
  );
}
