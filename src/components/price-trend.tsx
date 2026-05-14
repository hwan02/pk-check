/**
 * 가격 추이 미니 차트 (KREAM 시그니처 — 인라인 SVG).
 * price_history 테이블에서 받은 데이터로 단순 라인 차트 + 기간 토글.
 */
"use client";

import { useMemo, useState } from "react";

interface Point {
  recorded_at: string;
  tcg_market: number | null;
  snkrdunk_price: number | null;
}

interface Props {
  data: Point[];
}

const RANGES = [
  { value: "1m", label: "1개월", days: 30 },
  { value: "3m", label: "3개월", days: 90 },
  { value: "6m", label: "6개월", days: 180 },
  { value: "1y", label: "1년", days: 365 },
  { value: "all", label: "전체", days: 99999 },
] as const;

type RangeKey = (typeof RANGES)[number]["value"];

export default function PriceTrend({ data }: Props) {
  const [range, setRange] = useState<RangeKey>("3m");

  const series = useMemo(() => {
    const cutoff = Date.now() - RANGES.find((r) => r.value === range)!.days * 86400_000;
    const filtered = data
      .filter((p) => new Date(p.recorded_at).getTime() >= cutoff)
      .map((p) => ({
        date: p.recorded_at,
        value: p.snkrdunk_price ?? (p.tcg_market != null ? p.tcg_market : null),
      }))
      .filter((p): p is { date: string; value: number } => p.value != null)
      .sort((a, b) => a.date.localeCompare(b.date));
    return filtered;
  }, [data, range]);

  if (series.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
        <p className="text-xs opacity-50 text-center py-8">시세 데이터가 아직 없어요.</p>
      </div>
    );
  }

  const values = series.map((s) => s.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const W = 600;
  const H = 160;
  const PAD = 8;

  const points = series.map((s, i) => {
    const x = PAD + (i / Math.max(series.length - 1, 1)) * (W - PAD * 2);
    const y = H - PAD - ((s.value - min) / span) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const polylinePath = points.join(" ");
  const areaPath = `M ${points[0]} L ${points.join(" L ")} L ${W - PAD},${H - PAD} L ${PAD},${H - PAD} Z`;

  const latest = series[series.length - 1];
  const first = series[0];
  const delta = latest.value - first.value;
  const deltaPct = first.value !== 0 ? (delta / first.value) * 100 : 0;
  const up = delta >= 0;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] tracking-widest uppercase opacity-50">시세 추이</p>
          <p className="text-sm font-semibold mt-0.5">
            {series.length}개 기록 ·
            <span className={`ml-1 ${up ? "text-[var(--sell)]" : "text-[var(--down)]"}`}>
              {up ? "▲" : "▼"} {Math.abs(deltaPct).toFixed(1)}%
            </span>
          </p>
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`text-[11px] px-2.5 py-1 rounded-full transition ${
                range === r.value
                  ? "bg-[var(--primary)] text-white"
                  : "opacity-50 hover:opacity-100"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40">
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={up ? "var(--sell)" : "var(--down)"} stopOpacity="0.18" />
            <stop offset="100%" stopColor={up ? "var(--sell)" : "var(--down)"} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#grad)" />
        <polyline points={polylinePath} fill="none" stroke={up ? "var(--sell)" : "var(--down)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="flex justify-between text-[11px] opacity-50 mt-1">
        <span>{first.date}</span>
        <span>{latest.date}</span>
      </div>
    </div>
  );
}
