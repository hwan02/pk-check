export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { createSsrClient } from "@/lib/supabase/ssr";
import {
  formatKRW,
  latestByGrade,
  MARKET_CATEGORY_LABEL,
  marketCardHref,
  priceChangePct,
  type MarketCard,
  type MarketPriceRow,
} from "@/lib/market";

interface Props {
  params: Promise<{ slug: string }>;
}

interface Article {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  cover_image: string | null;
  body_md: string;
  published_at: string;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderChipHtml(c: MarketCard, history: MarketPriceRow[]): string {
  const top = latestByGrade(history)[0];
  const ch = top ? priceChangePct(top.latest, top.prev) : null;
  const changeHtml = ch
    ? ch.dir === "up"
      ? `<span class="mc-up">▲${ch.pct.toFixed(1)}%</span>`
      : ch.dir === "down"
        ? `<span class="mc-down">▼${Math.abs(ch.pct).toFixed(1)}%</span>`
        : ""
    : "";
  const img = c.image_url
    ? `<img src="${esc(c.image_url)}" alt="${esc(c.name)}" />`
    : `<span class="mc-img"></span>`;
  const priceHtml = top
    ? `<span class="mc-price">${formatKRW(top.latest)}</span>`
    : `<span class="mc-price mc-no-price">시세 준비 중</span>`;
  return (
    `<a href="${esc(marketCardHref(c))}" class="market-chip">` +
    img +
    `<span class="mc-name">${esc(c.name)}</span>` +
    priceHtml +
    changeHtml +
    `<span class="mc-arrow">→</span>` +
    `</a>`
  );
}

export default async function ContentDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createSsrClient();
  const { data } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!data) notFound();
  const article = data as Article;

  // 본문 안 인라인 카드 임베드 토큰 처리: {{card:UUID}}
  const TOKEN_RE = /\{\{card:([0-9a-fA-F-]{8,})\}\}/g;
  const inlineIds = new Set<string>();
  for (const m of article.body_md.matchAll(TOKEN_RE)) inlineIds.add(m[1]);
  const inlineCardMap = new Map<string, MarketCard>();
  const inlineHistoryMap = new Map<string, MarketPriceRow[]>();
  if (inlineIds.size > 0) {
    const ids = [...inlineIds];
    const [cardsResult, histResult] = await Promise.all([
      supabase.from("market_cards").select("*").in("id", ids),
      supabase
        .from("market_price_history")
        .select("*")
        .in("card_id", ids)
        .order("recorded_at", { ascending: false })
        .limit(500),
    ]);
    for (const c of (cardsResult.data ?? []) as MarketCard[]) {
      if (c.is_active) inlineCardMap.set(c.id, c);
    }
    for (const r of (histResult.data ?? []) as MarketPriceRow[]) {
      const arr = inlineHistoryMap.get(r.card_id) ?? [];
      arr.push(r);
      inlineHistoryMap.set(r.card_id, arr);
    }
  }
  const bodyWithChips = article.body_md.replace(TOKEN_RE, (_, id: string) => {
    const c = inlineCardMap.get(id);
    if (!c) return `<span class="market-chip-missing">[카드 없음]</span>`;
    return renderChipHtml(c, inlineHistoryMap.get(c.id) ?? []);
  });
  const html = await marked.parse(bodyWithChips, { gfm: true, breaks: true });

  // 시세 픽 카드 조회
  const { data: pickRows } = await supabase
    .from("article_market_picks")
    .select("market_card_id, display_order, market_cards(*)")
    .eq("article_id", article.id)
    .order("display_order", { ascending: true });
  const picks: MarketCard[] = ((pickRows ?? []) as unknown as { market_cards: MarketCard | MarketCard[] | null }[])
    .flatMap((r) => (Array.isArray(r.market_cards) ? r.market_cards : r.market_cards ? [r.market_cards] : []))
    .filter((c): c is MarketCard => !!c && c.is_active);

  // 픽 카드들의 가격 history (등급별 최신가 표시용)
  const pickHistoryByCard = new Map<string, MarketPriceRow[]>();
  // 픽 카드 → 부모 체인 따라 올라가서 박스 이름(=팩명) 해석
  const pickSetNameById = new Map<string, string>();
  if (picks.length > 0) {
    const [histResult, parentsResult] = await Promise.all([
      supabase
        .from("market_price_history")
        .select("*")
        .in("card_id", picks.map((c) => c.id))
        .order("recorded_at", { ascending: false })
        .limit(500),
      (async () => {
        const ancestorByPick = new Map<string, MarketCard>();
        let frontier = picks
          .map((c) => ({ pickId: c.id, currentId: c.parent_id, self: c }))
          .filter((x): x is { pickId: string; currentId: string; self: MarketCard } => !!x.currentId);
        // 최대 2 hop (single → pack → box)
        for (let hop = 0; hop < 3 && frontier.length > 0; hop++) {
          const ids = [...new Set(frontier.map((f) => f.currentId))];
          const { data: nodes } = await supabase
            .from("market_cards")
            .select("*")
            .in("id", ids);
          const nodeMap = new Map((nodes ?? []).map((n) => [n.id, n as MarketCard]));
          const next: typeof frontier = [];
          for (const f of frontier) {
            const n = nodeMap.get(f.currentId);
            if (!n) continue;
            // 박스(box) 도달 또는 더 위가 없으면 확정
            if (n.product_type === "box" || !n.parent_id) {
              ancestorByPick.set(f.pickId, n);
            } else {
              ancestorByPick.set(f.pickId, n); // 일단 현재 노드로 갱신, 더 위가 있으면 갈아치움
              next.push({ pickId: f.pickId, currentId: n.parent_id, self: f.self });
            }
          }
          frontier = next;
        }
        return ancestorByPick;
      })(),
    ]);
    for (const r of (histResult.data ?? []) as MarketPriceRow[]) {
      const arr = pickHistoryByCard.get(r.card_id) ?? [];
      arr.push(r);
      pickHistoryByCard.set(r.card_id, arr);
    }
    for (const [pickId, ancestor] of parentsResult) {
      const setName = ancestor.set_name ?? ancestor.name;
      if (setName) pickSetNameById.set(pickId, setName);
    }
    // 부모 없이 자체 set_name 만 있는 경우도 보강
    for (const p of picks) {
      if (!pickSetNameById.has(p.id) && p.set_name) pickSetNameById.set(p.id, p.set_name);
    }
  }

  return (
    <article className="max-w-3xl mx-auto px-4 pt-6 pb-16">
      <header className="text-center mb-10">
        <p className="text-[10px] tracking-[0.3em] uppercase opacity-50">
          {new Date(article.published_at).toLocaleDateString("ko-KR")}
        </p>
        <h1 className="text-2xl md:text-4xl font-black tracking-tight leading-tight mt-2">
          {article.title}
        </h1>
        {article.subtitle && (
          <p className="text-sm md:text-base opacity-60 mt-3 max-w-xl mx-auto">{article.subtitle}</p>
        )}
      </header>

      {picks.length > 0 && (
        <section className="mb-12">
          <ul className="grid grid-cols-2 gap-4 sm:gap-6">
            {picks.map((c) => {
              const grades = latestByGrade(pickHistoryByCard.get(c.id) ?? []);
              const top = grades[0];
              const ch = top ? priceChangePct(top.latest, top.prev) : null;
              const setName = pickSetNameById.get(c.id);
              return (
                <li key={c.id}>
                  <Link href={marketCardHref(c)} className="block group">
                    <div className="rounded-2xl overflow-hidden bg-white border border-[var(--border)]">
                      <div className="aspect-[5/7] relative">
                        {c.image_url ? (
                          <Image
                            src={c.image_url}
                            alt={c.name}
                            fill
                            sizes="(max-width: 640px) 50vw, 50vw"
                            className="object-contain group-hover:scale-[1.02] transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs opacity-40">no image</div>
                        )}
                      </div>
                    </div>
                    <div className="mt-2.5 px-0.5">
                      {setName && (
                        <p className="text-[10px] opacity-55 line-clamp-1">{setName}</p>
                      )}
                      <p className="text-[14px] font-bold leading-snug line-clamp-1 mt-0.5">{c.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] opacity-50">{c.rarity ?? ""}</span>
                      </div>
                      {top ? (
                        <div className="mt-1 flex items-baseline gap-2">
                          <p className="text-[16px] font-extrabold tracking-tight">{formatKRW(top.latest)}</p>
                          {ch && (
                            <span
                              className={`text-[11px] font-semibold ${
                                ch.dir === "up" ? "text-red-600" : ch.dir === "down" ? "text-blue-600" : "opacity-50"
                              }`}
                            >
                              {ch.dir === "up" ? "▲" : ch.dir === "down" ? "▼" : "·"}{" "}
                              {Math.abs(ch.pct).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] opacity-50 mt-1">시세 정보 없음</p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div
        className="text-center text-xs opacity-50 article-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}
