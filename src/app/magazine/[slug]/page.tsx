export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { createSsrClient } from "@/lib/supabase/ssr";
import {
  formatKRW,
  latestByGrade,
  MARKET_CATEGORY_LABEL,
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

function renderChipHtml(c: MarketCard): string {
  const ch = priceChange(c);
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
  return (
    `<a href="/market/${esc(c.id)}" class="market-chip">` +
    img +
    `<span class="mc-name">${esc(c.name)}</span>` +
    `<span class="mc-price">${formatKRW(c.price_krw)}</span>` +
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
  if (inlineIds.size > 0) {
    const { data: inlineRows } = await supabase
      .from("market_cards")
      .select("*")
      .in("id", [...inlineIds]);
    for (const c of (inlineRows ?? []) as MarketCard[]) {
      if (c.is_active) inlineCardMap.set(c.id, c);
    }
  }
  const bodyWithChips = article.body_md.replace(TOKEN_RE, (_, id: string) => {
    const c = inlineCardMap.get(id);
    if (!c) return `<span class="market-chip-missing">[카드 없음]</span>`;
    return renderChipHtml(c);
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
  if (picks.length > 0) {
    const { data: histRows } = await supabase
      .from("market_price_history")
      .select("*")
      .in("card_id", picks.map((c) => c.id))
      .order("recorded_at", { ascending: false })
      .limit(500);
    for (const r of (histRows ?? []) as MarketPriceRow[]) {
      const arr = pickHistoryByCard.get(r.card_id) ?? [];
      arr.push(r);
      pickHistoryByCard.set(r.card_id, arr);
    }
  }

  return (
    <article className="max-w-3xl mx-auto px-4 py-8">
      <nav className="text-xs opacity-60 mb-4">
        <Link href="/magazine" className="hover:opacity-100">← 매거진</Link>
      </nav>

      <header className="mb-8">
        <p className="text-[10px] tracking-[0.3em] uppercase opacity-50">
          {new Date(article.published_at).toLocaleDateString("ko-KR")}
        </p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight mt-2">
          {article.title}
        </h1>
        {article.subtitle && <p className="text-base opacity-70 mt-3">{article.subtitle}</p>}
      </header>

      {article.cover_image && (
        <div className="aspect-[16/9] relative rounded-2xl overflow-hidden bg-[var(--surface)] border border-[var(--border)] mb-8">
          <Image src={article.cover_image} alt={article.title} fill sizes="(max-width: 768px) 100vw, 768px" className="object-cover" priority />
        </div>
      )}

      <div
        className="prose prose-sm md:prose-base max-w-none article-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {picks.length > 0 && (
        <section className="mt-12 pt-8 border-t border-[var(--border)]">
          <div className="mb-5">
            <p className="text-[10px] tracking-[0.3em] uppercase opacity-50">This Week&apos;s Picks</p>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight mt-1">이번 주 픽 카드</h2>
          </div>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-6">
            {picks.map((c) => {
              const grades = latestByGrade(pickHistoryByCard.get(c.id) ?? []);
              const top = grades[0];
              const ch = top ? priceChangePct(top.latest, top.prev) : null;
              return (
                <li key={c.id}>
                  <Link href={`/market/${c.id}`} className="block group">
                    <div className="rounded-xl overflow-hidden bg-[var(--surface)] border border-[var(--border)]">
                      <div className="aspect-square relative bg-white">
                        {c.image_url ? (
                          <Image
                            src={c.image_url}
                            alt={c.name}
                            fill
                            className="object-contain p-3 group-hover:scale-[1.03] transition-transform"
                            sizes="(max-width: 640px) 50vw, 33vw"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs opacity-40">no image</div>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 px-0.5">
                      <p className="text-[10px] tracking-widest uppercase opacity-50">
                        {[MARKET_CATEGORY_LABEL[c.category], c.set_name].filter(Boolean).join(" · ")}
                      </p>
                      <p className="text-[13px] font-bold leading-snug line-clamp-1 mt-0.5">{c.name}</p>
                      {top ? (
                        <>
                          <div className="mt-1 flex items-baseline gap-2">
                            <p className="text-[14px] font-extrabold tracking-tight">{formatKRW(top.latest)}</p>
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
                          <p className="text-[10px] opacity-50 mt-0.5">{top.grade} 기준</p>
                        </>
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
    </article>
  );
}
