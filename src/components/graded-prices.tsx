"use client";

import { useEffect, useMemo, useState } from "react";

interface Entry {
  id: number;
  card_id: string;
  company: string;
  grade: string;
  price: number;
  currency: string;
  recorded_at: string;
  note: string | null;
}

const COMPANIES = ["PSA", "BGS", "CGC", "SGC", "기타"];
const CURRENCIES = ["KRW", "JPY", "USD"];

function formatPrice(price: number, currency: string): string {
  if (currency === "KRW") return `₩${price.toLocaleString("ko-KR")}`;
  if (currency === "JPY") return `¥${price.toLocaleString("ja-JP")}`;
  if (currency === "USD") return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `${price.toLocaleString()} ${currency}`;
}

export default function GradedPrices({ cardId }: { cardId: string }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // form state
  const [company, setCompany] = useState("PSA");
  const [customCompany, setCustomCompany] = useState("");
  const [grade, setGrade] = useState("10");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("KRW");
  const [recordedAt, setRecordedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/graded-prices?cardId=${encodeURIComponent(cardId)}`);
    const j = await r.json();
    setEntries(j.entries ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  async function add() {
    if (!price) return;
    setSubmitting(true);
    const actualCompany = company === "기타" ? customCompany.trim() : company;
    if (!actualCompany) {
      setSubmitting(false);
      return;
    }
    const r = await fetch("/api/graded-prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cardId,
        company: actualCompany,
        grade,
        price: parseFloat(price),
        currency,
        recorded_at: recordedAt,
        note: note || null,
      }),
    });
    if (r.ok) {
      setPrice("");
      setNote("");
      setShowForm(false);
      await load();
    } else {
      const j = await r.json().catch(() => ({}));
      alert("저장 실패: " + (j.error ?? r.status));
    }
    setSubmitting(false);
  }

  async function remove(id: number) {
    if (!confirm("삭제할까요?")) return;
    const r = await fetch(`/api/graded-prices?id=${id}`, { method: "DELETE" });
    if (r.ok) await load();
  }

  // (company, grade)별로 묶어서 최신값 + 히스토리 표시
  const grouped = useMemo(() => {
    const m = new Map<string, Entry[]>();
    for (const e of entries) {
      const key = `${e.company}|${e.grade}`;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(e);
    }
    return [...m.entries()]
      .map(([key, list]) => {
        const [comp, gr] = key.split("|");
        return { company: comp, grade: gr, list };
      })
      .sort((a, b) => {
        if (a.company !== b.company) return a.company.localeCompare(b.company);
        return parseFloat(b.grade) - parseFloat(a.grade);
      });
  }, [entries]);

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">등급별 시세 (수동 입력)</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-3 py-1.5 text-sm rounded-lg bg-[var(--primary)] text-white hover:opacity-90"
        >
          {showForm ? "취소" : "추가"}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 p-3 rounded-lg border border-[var(--border)] bg-[var(--card-bg)]">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
            <select value={company} onChange={(e) => setCompany(e.target.value)} className="px-2 py-1.5 rounded border border-[var(--border)] bg-[var(--background)]">
              {COMPANIES.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
            {company === "기타" && (
              <input
                type="text"
                placeholder="회사명"
                value={customCompany}
                onChange={(e) => setCustomCompany(e.target.value)}
                className="px-2 py-1.5 rounded border border-[var(--border)] bg-[var(--background)]"
              />
            )}
            <input
              type="text"
              placeholder="등급 (10, 9.5...)"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="px-2 py-1.5 rounded border border-[var(--border)] bg-[var(--background)]"
            />
            <input
              type="number"
              placeholder="가격"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="px-2 py-1.5 rounded border border-[var(--border)] bg-[var(--background)]"
            />
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="px-2 py-1.5 rounded border border-[var(--border)] bg-[var(--background)]">
              {CURRENCIES.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
            <input
              type="date"
              value={recordedAt}
              onChange={(e) => setRecordedAt(e.target.value)}
              className="px-2 py-1.5 rounded border border-[var(--border)] bg-[var(--background)]"
            />
            <input
              type="text"
              placeholder="메모(선택)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="px-2 py-1.5 rounded border border-[var(--border)] bg-[var(--background)] col-span-2"
            />
          </div>
          <div className="mt-2 flex justify-end">
            <button
              onClick={add}
              disabled={submitting || !price}
              className="px-3 py-1.5 text-sm rounded-lg bg-[var(--primary)] text-white disabled:opacity-50"
            >
              {submitting ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm opacity-50">로딩 중...</p>
      ) : grouped.length === 0 ? (
        <p className="text-sm opacity-50">아직 등록된 등급 시세가 없어요. &quot;추가&quot;로 입력하세요.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {grouped.map(({ company, grade, list }) => {
            const latest = list[0];
            const prev = list[1];
            const delta = prev ? latest.price - prev.price : null;
            const deltaPct = prev && prev.price !== 0 ? (delta! / prev.price) * 100 : null;
            return (
              <div key={`${company}-${grade}`} className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-3">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-sm font-semibold">{company} {grade}</span>
                  <span className="text-xs opacity-50">{list.length}건</span>
                </div>
                <p className="text-xl font-bold">{formatPrice(latest.price, latest.currency)}</p>
                <p className="text-xs opacity-60">{latest.recorded_at}</p>
                {delta != null && (
                  <p className={`text-xs ${delta > 0 ? "text-red-500" : delta < 0 ? "text-blue-500" : "opacity-50"}`}>
                    {delta > 0 ? "▲" : delta < 0 ? "▼" : "—"}
                    {Math.abs(delta).toLocaleString()} ({deltaPct?.toFixed(1)}%)
                  </p>
                )}

                {list.length > 1 && (
                  <details className="mt-2">
                    <summary className="text-xs cursor-pointer opacity-60 hover:opacity-100">히스토리</summary>
                    <ul className="mt-1 space-y-0.5">
                      {list.map((e) => (
                        <li key={e.id} className="flex justify-between text-xs">
                          <span className="opacity-60">{e.recorded_at}</span>
                          <span>{formatPrice(e.price, e.currency)}</span>
                          <button onClick={() => remove(e.id)} className="opacity-30 hover:opacity-100 hover:text-red-500" title="삭제">×</button>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
