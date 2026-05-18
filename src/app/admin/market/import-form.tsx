"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SetRow {
  id: string;
  name: string;
  release_date: string | null;
  region: string | null;
  cardCount: number;
}

// 자주 등장하는 rarity 옵션 (한국판 rarity_ja 기준 / 영문 rarity 도 있음)
const RARITY_PRESETS: { value: string; label: string }[] = [
  { value: "SAR", label: "SAR" },
  { value: "SR", label: "SR" },
  { value: "AR", label: "AR" },
  { value: "UR", label: "UR" },
  { value: "RR", label: "RR (Double Rare)" },
  { value: "Double Rare", label: "Double Rare" },
  { value: "Special Illustration Rare", label: "Special Illustration Rare" },
  { value: "Illustration Rare", label: "Illustration Rare" },
  { value: "Hyper Rare", label: "Hyper Rare" },
  { value: "Ultra Rare", label: "Ultra Rare" },
  { value: "Rare", label: "Rare" },
  { value: "Uncommon", label: "Uncommon" },
  { value: "Common", label: "Common" },
];

export default function BulkImportForm({ sets }: { sets: SetRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [setId, setSetId] = useState("");
  const [rarities, setRarities] = useState<string[]>([
    "SAR",
    "SR",
    "AR",
    "UR",
    "RR",
    "Double Rare",
    "Special Illustration Rare",
    "Illustration Rare",
    "Hyper Rare",
    "Ultra Rare",
  ]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const selected = sets.find((s) => s.id === setId);

  function toggleRarity(r: string) {
    setRarities((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));
  }

  async function run() {
    if (!setId) return;
    setLoading(true);
    setMsg("");
    const resp = await fetch("/api/admin/market/bulk-import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        set_id: setId,
        rarity_filter: rarities.length > 0 ? rarities : null,
      }),
    });
    const json = await resp.json();
    setLoading(false);
    if (resp.ok) {
      setMsg(`완료. ${json.imported}장 추가 / ${json.skipped}장 건너뜀`);
      router.refresh();
    } else {
      setMsg(`실패: ${json.error ?? "오류"}`);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-lg border border-[var(--primary)] text-[var(--primary)] text-sm font-medium hover:bg-[var(--primary)]/10"
      >
        ⊕ 박스에서 일괄 import
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border)] p-4 bg-[var(--card-bg)] space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">박스(세트) 카드 일괄 import</h3>
        <button onClick={() => setOpen(false)} className="text-xs opacity-60 hover:opacity-100">
          닫기
        </button>
      </div>

      <p className="text-[11px] opacity-60">
        카탈로그(cards) 에서 박스의 카드들을 시세 placeholder 로 가져옵니다. 비활성 상태로
        들어가니, 가격 채우고 노출 토글해주세요. 같은 박스를 다시 실행해도 중복 import 되지 않습니다.
      </p>

      {/* 박스 선택 */}
      <label className="block">
        <span className="block text-xs opacity-60 mb-1">박스</span>
        <select
          value={setId}
          onChange={(e) => setSetId(e.target.value)}
          className="w-full px-3 py-2 rounded border border-[var(--border)] bg-[var(--background)] text-sm"
        >
          <option value="">— 박스 선택 —</option>
          {sets.map((s) => (
            <option key={s.id} value={s.id}>
              [{s.cardCount.toString().padStart(3)}] {s.name}
            </option>
          ))}
        </select>
      </label>

      {/* rarity 필터 */}
      <div>
        <p className="text-xs opacity-60 mb-1.5">
          포함할 rarity ({rarities.length}개 선택, 비우면 전체)
        </p>
        <div className="flex flex-wrap gap-1.5">
          {RARITY_PRESETS.map((r) => {
            const on = rarities.includes(r.value);
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => toggleRarity(r.value)}
                className={`text-[11px] px-2 py-1 rounded-full border ${
                  on
                    ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] font-semibold"
                    : "border-[var(--border)] opacity-70 hover:opacity-100"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <p className="text-[11px] opacity-70">
          → <span className="font-semibold">{selected.name}</span> (총 {selected.cardCount}장)
          {rarities.length > 0 ? ` 중 선택한 rarity 만` : ` 전체`}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={run}
          disabled={!setId || loading}
          className="px-4 py-2 text-sm rounded-lg bg-[var(--primary)] text-white disabled:opacity-50"
        >
          {loading ? "import 중..." : "import 실행"}
        </button>
        {msg && <span className="text-[11px] opacity-80">{msg}</span>}
      </div>
    </div>
  );
}
