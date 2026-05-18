export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { createSsrClient } from "@/lib/supabase/ssr";
import { formatKRW, MARKET_CATEGORY_LABEL, priceChange, type MarketCard } from "@/lib/market";

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
  const html = await marked.parse(article.body_md, { gfm: true, breaks: true });

  // 시세 픽 카드 조회
  const { data: pickRows } = await supabase
    .from("article_market_picks")
    .select("market_card_id, display_order, market_cards(*)")
    .eq("article_id", article.id)
    .order("display_order", { ascending: true });
  const picks: MarketCard[] = ((pickRows ?? []) as unknown as { market_cards: MarketCard | MarketCard[] | null }[])
    .flatMap((r) => (Array.isArray(r.market_cards) ? r.market_cards : r.market_cards ? [r.market_cards] : []))
    .filter((c): c is MarketCard => !!c && c.is_active);

  return (
    <article className="max-w-3xl mx-auto px-4 py-8">
      <nav className="text-xs opacity-60 mb-4">
        <Link href="/content" className="hover:opacity-100">← 매거진</Link>
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
              const ch = priceChange(c);
              return (
                <li key={c.id}>
                  <Link href={`/market?category=${c.category}`} className="block group">
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
                      <div className="mt-1 flex items-baseline gap-2">
                        <p className="text-[14px] font-extrabold tracking-tight">{formatKRW(c.price_krw)}</p>
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
