"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MarketPriceRow } from "@/lib/market";

const RANGES = [
  { value: "1m", label: "1개월", days: 30 },
  { value: "3m", label: "3개월", days: 90 },
  { value: "6m", label: "6개월", days: 180 },
  { value: "1y", label: "1년", days: 365 },
  { value: "all", label: "전체", days: 99999 },
] as const;

type RangeKey = (typeof RANGES)[number]["value"];

const COLORS = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

function fmtTick(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

export default function MarketChart({ history }: { history: MarketPriceRow[] }) {
  const allGrades = useMemo(() => {
    const set = new Set<string>();
    for (const r of history) set.add(r.grade);
    return [...set];
  }, [history]);

  const [range, setRange] = useState<RangeKey>("3m");
  const [selected, setSelected] = useState<string[]>(allGrades);

  // 등급별 필터링된 데이터 (날짜순 오름차순)
  const { rows, gradeOrder } = useMemo(() => {
    const cutoff =
      Date.now() - (RANGES.find((r) => r.value === range)?.days ?? 99999) * 86400_000;
    const enabled = new Set(selected);
    const byDate = new Map<string, Record<string, number | null>>();
    for (const r of history) {
      if (!enabled.has(r.grade)) continue;
      if (new Date(r.recorded_at).getTime() < cutoff) continue;
      const row = byDate.get(r.recorded_at) ?? ({ date: r.recorded_at } as Record<string, number | null | string>);
      // 같은 (날짜, 등급) 중복이면 최신 입력값으로 덮기 (created_at 신경 X — 일별 가격으로 처리)
      row[r.grade] = r.price_krw;
      byDate.set(r.recorded_at, row as Record<string, number | null>);
    }
    const arr = [...byDate.values()].sort((a, b) =>
      String(a.date).localeCompare(String(b.date)),
    );
    return { rows: arr, gradeOrder: [...enabled] };
  }, [history, range, selected]);

  if (allGrades.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
        <p className="text-xs opacity-50 text-center py-8">시세 데이터가 아직 없어요.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {allGrades.map((g, i) => {
            const on = selected.includes(g);
            return (
              <button
                key={g}
                type="button"
                onClick={() =>
                  setSelected((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]))
                }
                className={`text-[11px] px-2 py-1 rounded-full border flex items-center gap-1 ${
                  on ? "border-[var(--border-strong)]" : "border-[var(--border)] opacity-50"
                }`}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                {g}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRange(r.value)}
              className={`text-[11px] px-2 py-1 rounded ${
                range === r.value
                  ? "bg-[var(--primary)] text-white"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs opacity-50 text-center py-12">선택한 기간/등급에 데이터가 없어요.</p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <LineChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtTick} width={48} />
              <Tooltip
                formatter={(v) =>
                  typeof v === "number" ? `₩${v.toLocaleString("ko-KR")}` : String(v ?? "")
                }
                labelStyle={{ color: "#222" }}
              />
              {gradeOrder.map((g, i) => (
                <Line
                  key={g}
                  type="monotone"
                  dataKey={g}
                  stroke={COLORS[allGrades.indexOf(g) % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
