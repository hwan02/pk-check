"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  COMMON_GRADES,
  formatKRW,
  MARKET_CATEGORY_LABEL,
  PARENT_TYPE_OF,
  PRODUCT_TYPE_LABEL,
  type MarketCard,
  type MarketPriceRow,
  type ProductType,
} from "@/lib/market";

/* ───────────── 이미지 확대 모달 ───────────── */
export function ImageThumb({ src, alt }: { src: string | null; alt: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!src) {
    return (
      <div className="w-14 h-14 rounded bg-gray-50 flex items-center justify-center text-[10px] opacity-40">
        x
      </div>
    );
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-14 h-14 relative rounded overflow-hidden bg-gray-50 hover:ring-2 hover:ring-[var(--primary)]"
        aria-label="이미지 확대"
      >
        <Image src={src} alt={alt} fill className="object-cover" sizes="56px" />
      </button>
      {open && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6"
        >
          <div className="relative w-full max-w-3xl aspect-square">
            <Image src={src} alt={alt} fill className="object-contain" sizes="100vw" />
          </div>
          <span className="absolute top-4 right-4 text-white/80 text-xs">클릭하여 닫기 (ESC)</span>
        </button>
      )}
    </>
  );
}

/* ───────────── inline 이름/세트/등급 편집 ───────────── */
export function InlineText({
  id,
  field,
  initial,
  placeholder,
  className = "",
}: {
  id: string;
  field: "name" | "name_en" | "set_name" | "rarity";
  initial: string | null;
  placeholder?: string;
  className?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if ((value || "") === (initial ?? "")) return;
    setSaving(true);
    const resp = await fetch(`/api/admin/market/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    setSaving(false);
    if (resp.ok) router.refresh();
    else alert("저장 실패");
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      placeholder={placeholder}
      className={`px-2 py-1 text-xs rounded border border-transparent hover:border-[var(--border)] focus:border-[var(--primary)] focus:outline-none bg-transparent w-full ${className} ${saving ? "opacity-50" : ""}`}
    />
  );
}

export function InlineCategory({ id, initial }: { id: string; initial: MarketCard["category"] }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  async function change(v: MarketCard["category"]) {
    if (v === value) return;
    setValue(v);
    setSaving(true);
    const resp = await fetch(`/api/admin/market/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ category: v }),
    });
    setSaving(false);
    if (resp.ok) router.refresh();
  }
  return (
    <select
      value={value}
      onChange={(e) => change(e.target.value as MarketCard["category"])}
      className={`text-[10px] px-1.5 py-0.5 rounded bg-[var(--primary)] text-white ${saving ? "opacity-50" : ""}`}
    >
      {(["pokemon", "onepiece"] as const).map((c) => (
        <option key={c} value={c}>
          {MARKET_CATEGORY_LABEL[c]}
        </option>
      ))}
    </select>
  );
}

/* ───────────── 인라인 상품 타입 ───────────── */
export function InlineProductType({
  id,
  initial,
  onChanged,
}: {
  id: string;
  initial: ProductType;
  onChanged?: (next: ProductType) => void;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function change(v: ProductType) {
    if (v === value) return;
    setSaving(true);
    // box로 바꿀 때는 parent_id 도 null 로 보냄
    const body: Record<string, unknown> = { product_type: v };
    if (v === "box") body.parent_id = null;
    const resp = await fetch(`/api/admin/market/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (resp.ok) {
      setValue(v);
      onChanged?.(v);
      router.refresh();
    } else {
      const j = await resp.json().catch(() => ({}));
      alert(`타입 변경 실패: ${j.error ?? resp.statusText}`);
    }
  }

  const colors: Record<ProductType, string> = {
    box: "bg-amber-100 text-amber-900",
    pack: "bg-sky-100 text-sky-900",
    single: "bg-violet-100 text-violet-900",
  };

  return (
    <select
      value={value}
      onChange={(e) => change(e.target.value as ProductType)}
      className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${colors[value]} ${saving ? "opacity-50" : ""}`}
    >
      {(["box", "pack", "single"] as ProductType[]).map((t) => (
        <option key={t} value={t}>
          {PRODUCT_TYPE_LABEL[t]}
        </option>
      ))}
    </select>
  );
}

/* ───────────── 인라인 부모 picker ───────────── */
export interface ParentOpt {
  id: string;
  name: string;
  product_type: ProductType;
  category: MarketCard["category"];
}

export function InlineParent({
  id,
  initialParentId,
  productType,
  category,
  parentOptions,
}: {
  id: string;
  initialParentId: string | null;
  productType: ProductType;
  category: MarketCard["category"];
  parentOptions: ParentOpt[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialParentId ?? "");
  const [saving, setSaving] = useState(false);

  const need = PARENT_TYPE_OF[productType];
  if (!need) return null; // 박스는 부모 없음

  const allowed = parentOptions.filter(
    (p) => p.product_type === need && p.category === category && p.id !== id,
  );

  async function change(next: string) {
    if (next === value) return;
    setSaving(true);
    const resp = await fetch(`/api/admin/market/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ parent_id: next || null }),
    });
    setSaving(false);
    if (resp.ok) {
      setValue(next);
      router.refresh();
    } else {
      const j = await resp.json().catch(() => ({}));
      alert(`부모 변경 실패: ${j.error ?? resp.statusText}`);
    }
  }

  return (
    <select
      value={value}
      onChange={(e) => change(e.target.value)}
      className={`text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--background)] max-w-[160px] truncate ${saving ? "opacity-50" : ""}`}
      title={value ? allowed.find((p) => p.id === value)?.name : ""}
    >
      <option value="">— {PRODUCT_TYPE_LABEL[need]} 미지정 —</option>
      {allowed.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}

export function ToggleActiveButton({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function toggle() {
    setLoading(true);
    const resp = await fetch(`/api/admin/market/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ is_active: !active }),
    });
    setLoading(false);
    if (resp.ok) router.refresh();
  }
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={active ? "노출중 (클릭해서 숨김)" : "숨김 (클릭해서 노출)"}
      onClick={toggle}
      disabled={loading}
      className={`relative inline-flex items-center h-5 w-10 rounded-full transition-colors disabled:opacity-50 ${
        active ? "bg-emerald-500" : "bg-gray-300"
      }`}
    >
      <span
        className={`absolute h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
          active ? "translate-x-[22px]" : "translate-x-1"
        }`}
      />
      <span className="sr-only">{active ? "노출중" : "숨김"}</span>
    </button>
  );
}

export function DeleteMarketButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function onDelete() {
    if (!confirm("삭제할까요? 가격 history도 함께 삭제됩니다.")) return;
    setLoading(true);
    const resp = await fetch(`/api/admin/market/${id}`, { method: "DELETE" });
    setLoading(false);
    if (resp.ok) router.refresh();
    else alert("삭제 실패");
  }
  return (
    <button
      onClick={onDelete}
      disabled={loading}
      className="text-xs px-2 py-1 rounded border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      {loading ? "..." : "삭제"}
    </button>
  );
}

/* ───────────── 커스텀 등급 드롭다운 ───────────── */
function GradeCombo({
  value,
  onChange,
  history,
}: {
  value: string;
  onChange: (v: string) => void;
  history: MarketPriceRow[];
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // 기존 history 의 등급 + 자주 쓰는 등급 합집합 (history 우선)
  const seenGrades = useMemo(() => {
    const set = new Set<string>();
    for (const r of history) set.add(r.grade);
    return set;
  }, [history]);
  const options = useMemo(() => {
    const arr: string[] = [];
    for (const g of seenGrades) arr.push(g);
    for (const g of COMMON_GRADES) {
      if (!seenGrades.has(g)) arr.push(g);
    }
    return arr;
  }, [seenGrades]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative w-28">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="등급"
        className="w-full pl-2 pr-6 py-1 text-xs rounded border border-[var(--border)] bg-[var(--background)]"
      />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center opacity-50 hover:opacity-100"
        aria-label="등급 목록 열기"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && options.length > 0 && (
        <ul className="absolute z-20 top-full left-0 mt-1 w-32 max-h-48 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card-bg)] shadow-lg py-1">
          {options.map((g) => (
            <li key={g}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(g);
                  setOpen(false);
                }}
                className={`w-full text-left px-2 py-1 text-xs hover:bg-[var(--surface)] ${
                  g === value ? "bg-[var(--surface)] font-semibold" : ""
                }`}
              >
                {g}
                {seenGrades.has(g) && <span className="ml-1 text-[9px] opacity-50">●</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ───────────── 가격 history 추가/관리 ───────────── */
export function PriceHistoryPanel({
  cardId,
  history,
}: {
  cardId: string;
  history: MarketPriceRow[];
}) {
  const router = useRouter();
  const [grade, setGrade] = useState("PSA 10");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function add() {
    const p = parseInt(price.replace(/[^0-9]/g, ""), 10);
    if (!grade.trim() || !Number.isFinite(p) || p < 0) {
      alert("등급 / 가격을 확인해주세요");
      return;
    }
    setSaving(true);
    const resp = await fetch(`/api/admin/market/${cardId}/price`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ grade: grade.trim(), price_krw: p, recorded_at: date }),
    });
    setSaving(false);
    if (resp.ok) {
      setPrice("");
      inputRef.current?.focus();
      router.refresh();
    } else {
      alert("저장 실패");
    }
  }

  async function del(rowId: string) {
    if (!confirm("이 가격 기록을 삭제할까요?")) return;
    const resp = await fetch(`/api/admin/market/${cardId}/price?row=${rowId}`, {
      method: "DELETE",
    });
    if (resp.ok) router.refresh();
  }

  // 등급별 그룹화 (최신순)
  const grouped = new Map<string, MarketPriceRow[]>();
  for (const r of history) {
    const arr = grouped.get(r.grade) ?? [];
    arr.push(r);
    grouped.set(r.grade, arr);
  }
  for (const arr of grouped.values()) {
    arr.sort((a, b) => b.recorded_at.localeCompare(a.recorded_at));
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/40 p-3 mt-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold">가격 기록 ({history.length})</p>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-[11px] opacity-60 hover:opacity-100"
        >
          {open ? "접기" : "펼치기"}
        </button>
      </div>

      {/* 입력 행 (항상 노출) */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <GradeCombo value={grade} onChange={setGrade} history={history} />
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={price}
          onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          placeholder="가격(원)"
          className="px-2 py-1 text-xs rounded border border-[var(--border)] bg-[var(--background)] w-28 text-right"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-2 py-1 text-xs rounded border border-[var(--border)] bg-[var(--background)]"
        />
        <button
          type="button"
          onClick={add}
          disabled={saving}
          className="text-xs px-3 py-1 rounded bg-[var(--primary)] text-white disabled:opacity-50"
        >
          {saving ? "..." : "추가"}
        </button>
      </div>

      {/* 등급별 요약 (접혀있을 때) */}
      {!open && (
        <ul className="flex flex-wrap gap-1.5">
          {[...grouped.entries()].map(([g, rows]) => (
            <li key={g} className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-[var(--border)]">
              <span className="opacity-60">{g}</span>{" "}
              <span className="font-semibold">{formatKRW(rows[0].price_krw)}</span>
              <span className="opacity-50"> · {rows[0].recorded_at}</span>
            </li>
          ))}
          {history.length === 0 && (
            <li className="text-[11px] opacity-50">기록 없음</li>
          )}
        </ul>
      )}

      {/* 전체 펼침 */}
      {open && (
        <div className="space-y-2">
          {[...grouped.entries()].map(([g, rows]) => (
            <div key={g}>
              <p className="text-[11px] font-semibold opacity-80 mb-1">{g}</p>
              <ul className="text-[11px] space-y-0.5">
                {rows.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-2 px-2 py-0.5 rounded hover:bg-white"
                  >
                    <span className="opacity-60">{r.recorded_at}</span>
                    <span className="font-mono">{formatKRW(r.price_krw)}</span>
                    <button
                      onClick={() => del(r.id)}
                      className="text-[10px] text-red-600 opacity-60 hover:opacity-100"
                    >
                      삭제
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
