"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { PriceHistory } from "@/lib/types";

export default function PriceChart({ history }: { history: PriceHistory[] }) {
  if (!history.length) {
    return (
      <div className="text-center py-10 opacity-50 text-sm">
        시세 기록이 아직 없습니다.
      </div>
    );
  }

  const data = history.map((h) => ({
    date: h.recorded_at,
    "TCGPlayer ($)": h.tcg_market,
    "snkrdunk (¥)": h.snkrdunk_price,
  }));

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => {
              const d = new Date(v);
              return `${d.getMonth() + 1}/${d.getDate()}`;
            }}
          />
          <YAxis yAxisId="usd" orientation="left" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="jpy" orientation="right" tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card-bg)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            yAxisId="usd"
            type="monotone"
            dataKey="TCGPlayer ($)"
            stroke="#16a34a"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            yAxisId="jpy"
            type="monotone"
            dataKey="snkrdunk (¥)"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
