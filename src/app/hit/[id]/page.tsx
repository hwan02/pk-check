export const revalidate = 60;

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSsrClient } from "@/lib/supabase/ssr";
import {
  formatKRW,
  isUuid,
  latestByGrade,
  marketCardHref,
  MARKET_CATEGORY_LABEL,
  PRODUCT_TYPE_LABEL,
  priceChangePct,
  safeImageUrl,
  type MarketCard,
  type MarketPriceRow,
} from "@/lib/market";
import { formatUSD } from "@/lib/shop";

// 시세 표시는 데이터 완성 시까지 임시 숨김
const SHOW_PRICE = false;

interface Props {
  params: Promise<{ id: string }>;
}

async function getCard(idOrShort: string): Promise<MarketCard | null> {
  const supabase = await createSsrClient();
  const column = isUuid(idOrShort) ? "id" : "short_id";
  const { data } = await supabase
    .from("market_cards")
    .select("*")
    .eq(column, idOrShort)
    .eq("is_active", true)
    .maybeSingle();
  return (data ?? null) as MarketCard | null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return { title: "카드를 찾을 수 없습니다" };

  // 최신가 한 줄로 추가
  const supabase = await createSsrClient();
  const { data: latestRow } = await supabase
    .from("market_price_history")
    .select("grade, price_krw")
    .eq("card_id", id)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const meta = [card.set_name, card.rarity].filter(Boolean).join(" · ");

  // 시세 표시는 임시 숨김 — 메타 description 에도 노출 안 함
  return {
    title: `${card.name} — Kikidult`,
    description: `${card.name} · ${MARKET_CATEGORY_LABEL[card.category]}${meta ? ` · ${meta}` : ""}`,
    openGraph: {
      title: `${card.name}`,
      description: meta || MARKET_CATEGORY_LABEL[card.category],
      images: card.image_url ? [{ url: card.image_url }] : [],
    },
  };
}

export default async function MarketDetailPage({ params }: Props) {
  const { id: idOrShort } = await params;
  const supabase = await createSsrClient();

  // 활성 카드만 접근 가능
  const column = isUuid(idOrShort) ? "id" : "short_id";
  const { data: cardRow } = await supabase
    .from("market_cards")
    .select("*")
    .eq(column, idOrShort)
    .eq("is_active", true)
    .maybeSingle();
  if (!cardRow) notFound();
  const card = cardRow as MarketCard;
  const id = card.id; // 이후 history/위계 쿼리는 항상 UUID

  const { data: histRows } = await supabase
    .from("market_price_history")
    .select("*")
    .eq("card_id", id)
    .order("recorded_at", { ascending: false })
    .limit(2000);
  const history = (histRows ?? []) as MarketPriceRow[];
  const grades = latestByGrade(history);

  // 위계 관련 데이터
  // - parent / grandparent : 박스(=parent) 정보는 비활성이어도 위계 표시는 노출
  // - children : 박스 시세 페이지일 때 그 박스 안 카드들
  // - siblings : single 시세 페이지에서 같은 박스/팩의 다른 카드들
  let parent: MarketCard | null = null;
  let grandparent: MarketCard | null = null;
  let children: MarketCard[] = [];
  let grandchildren: MarketCard[] = [];
  let siblings: MarketCard[] = [];

  if (card.parent_id) {
    const { data: p } = await supabase
      .from("market_cards")
      .select("*")
      .eq("id", card.parent_id)
      .eq("is_active", true)
      .maybeSingle();
    parent = (p ?? null) as MarketCard | null;
    if (parent?.parent_id) {
      const { data: gp } = await supabase
        .from("market_cards")
        .select("*")
        .eq("id", parent.parent_id)
        .eq("is_active", true)
        .maybeSingle();
      grandparent = (gp ?? null) as MarketCard | null;
    }

    // 형제: 같은 박스 트리 안 다른 활성 카드 모두
    // rootBox = grandparent(있으면 박스) 또는 parent(그 자체가 박스)
    const rootBoxId = grandparent?.id ?? parent?.id;
    if (rootBoxId) {
      // 박스의 직속 자식들 (팩 또는 싱글)
      const { data: depth1 } = await supabase
        .from("market_cards")
        .select("*")
        .eq("parent_id", rootBoxId)
        .eq("is_active", true);
      const tree: MarketCard[] = (depth1 ?? []) as MarketCard[];

      // 자식 중 팩이 있으면 그 팩의 자식(싱글)까지
      const packIds = tree.filter((c) => c.product_type === "pack").map((c) => c.id);
      if (packIds.length > 0) {
        const { data: depth2 } = await supabase
          .from("market_cards")
          .select("*")
          .in("parent_id", packIds)
          .eq("is_active", true);
        tree.push(...((depth2 ?? []) as MarketCard[]));
      }

      siblings = tree
        .filter((c) => c.id !== card.id)
        .sort((a, b) => a.display_order - b.display_order);
    }
  }

  if (card.product_type !== "single") {
    const { data: ch } = await supabase
      .from("market_cards")
      .select("*")
      .eq("parent_id", id)
      .eq("is_active", true)
      .order("display_order", { ascending: true });
    children = (ch ?? []) as MarketCard[];

    // box → 손주(싱글)까지 끌어옴: 자식 팩들의 자식 싱글
    if (card.product_type === "box" && children.length > 0) {
      const packIds = children.filter((c) => c.product_type === "pack").map((c) => c.id);
      if (packIds.length > 0) {
        const { data: gch } = await supabase
          .from("market_cards")
          .select("*")
          .in("parent_id", packIds)
          .eq("is_active", true)
          .order("display_order", { ascending: true });
        grandchildren = (gch ?? []) as MarketCard[];
      }
    }
  }

  // 자식/손주/형제/부모 들의 최신가 미니 표시용 history
  const relatedIds = [
    ...children,
    ...grandchildren,
    ...siblings,
    ...(parent ? [parent] : []),
    ...(grandparent ? [grandparent] : []),
  ].map((c) => c.id);
  const relatedHistByCard = new Map<string, MarketPriceRow[]>();
  if (relatedIds.length > 0) {
    const { data: relHist } = await supabase
      .from("market_price_history")
      .select("*")
      .in("card_id", relatedIds)
      .order("recorded_at", { ascending: false })
      .limit(2000);
    for (const r of (relHist ?? []) as MarketPriceRow[]) {
      const arr = relatedHistByCard.get(r.card_id) ?? [];
      arr.push(r);
      relatedHistByCard.set(r.card_id, arr);
    }
  }

  // 관련 매물 (이름으로 느슨하게 매칭)
  const { data: listingRows } = await supabase
    .from("listings")
    .select("id, short_id, title, title_en, image_url, price_usd, stock")
    .or(
      `title.ilike.%${card.name}%${card.name_en ? `,title_en.ilike.%${card.name_en}%` : ""}`,
    )
    .eq("is_active", true)
    .gt("stock", 0)
    .limit(3);
  type RelatedListing = {
    id: string;
    short_id: string | null;
    title: string;
    title_en: string | null;
    image_url: string | null;
    price_usd: number;
    stock: number;
  };
  const listings = (listingRows ?? []) as RelatedListing[];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* breadcrumb */}
      <nav className="text-xs opacity-60 mb-4 flex items-center gap-1.5 flex-wrap">
        <Link href="/hit" className="hover:opacity-100">
          MARKET
        </Link>
        <span>/</span>
        <Link href={`/hit?category=${card.category}`} className="hover:opacity-100">
          {MARKET_CATEGORY_LABEL[card.category]}
        </Link>
        <span>/</span>
        <Link
          href={`/hit?category=${card.category}&type=${card.product_type}`}
          className="hover:opacity-100"
        >
          {PRODUCT_TYPE_LABEL[card.product_type]}
        </Link>
        {grandparent && (
          <>
            <span>/</span>
            {grandparent.is_active ? (
              <Link href={marketCardHref(grandparent)} className="hover:opacity-100 truncate max-w-[140px]">
                {grandparent.name}
              </Link>
            ) : (
              <span className="truncate max-w-[140px] opacity-70" title={`비활성: ${grandparent.name}`}>
                {grandparent.name}
              </span>
            )}
          </>
        )}
        {parent && (
          <>
            <span>/</span>
            {parent.is_active ? (
              <Link href={marketCardHref(parent)} className="hover:opacity-100 truncate max-w-[140px]">
                {parent.name}
              </Link>
            ) : (
              <span className="truncate max-w-[140px] opacity-70" title={`비활성: ${parent.name}`}>
                {parent.name}
              </span>
            )}
          </>
        )}
        <span>/</span>
        <span className="opacity-80 truncate">{card.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-6 lg:gap-10">
        {/* 이미지 */}
        <div>
          <div className="aspect-square relative rounded-2xl overflow-hidden bg-[var(--card-bg)] border border-[var(--border)]">
            {card.image_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={safeImageUrl(card.image_url)!}
                alt={card.name}
                decoding="async"
                className="absolute inset-0 w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm opacity-40">
                이미지 없음
              </div>
            )}
          </div>
        </div>

        {/* 정보 + 등급별 최신가 */}
        <div className="space-y-4">
          <div>
            <p className="text-xs tracking-widest opacity-50 uppercase">
              {MARKET_CATEGORY_LABEL[card.category]}
              {card.set_name && <> · {card.set_name}</>}
              {card.rarity && <> · {card.rarity}</>}
            </p>
            <h1 className="text-2xl md:text-3xl font-bold leading-tight tracking-tight mt-1">
              {card.name}
            </h1>
            {card.name_en && (
              <p className="text-sm opacity-60 mt-1">{card.name_en}</p>
            )}
            {card.notes && (
              <p className="text-xs opacity-70 mt-3 whitespace-pre-line">{card.notes}</p>
            )}
          </div>

          {/* 시세 표시는 데이터 완성 시까지 임시 숨김 */}
          {SHOW_PRICE && (
            <>
              {/* 정가 */}
              {card.list_price_krw != null && (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 flex items-baseline justify-between">
                  <span className="text-xs opacity-60">정가</span>
                  <span className="text-base font-extrabold tracking-tight">
                    {(card.list_price_krw).toLocaleString("ko-KR")}원
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 위계 — 부모(팩/박스). 클릭해서 위로 올라가는 경로 */}
      {(() => {
        const ancestors: MarketCard[] = [];
        if (parent?.is_active) ancestors.push(parent);
        if (grandparent?.is_active && grandparent.id !== parent?.id) ancestors.push(grandparent);
        if (ancestors.length === 0) return null;
        return (
          <section className="mt-10">
            <h2 className="text-sm font-semibold tracking-widest uppercase opacity-70 mb-3">
              {card.product_type === "single" ? "이 카드의 팩 / 박스" : "이 팩의 박스"}
              <span className="ml-2 opacity-50 normal-case tracking-normal text-xs">
                {ancestors.length}
              </span>
            </h2>
            <RelatedGrid items={ancestors} historyByCard={relatedHistByCard} />
          </section>
        );
      })()}

      {/* 위계 — 자식 그리드. 박스 시세는 자식을 팩 / 싱글 로 분리해서 노출 */}
      {card.product_type === "box" && (
        <>
          {(() => {
            const childPacks = children.filter((c) => c.product_type === "pack");
            const allSingles = [
              ...children.filter((c) => c.product_type === "single"),
              ...grandchildren,
            ];
            return (
              <>
                {childPacks.length > 0 && (
                  <section className="mt-10">
                    <h2 className="text-sm font-semibold tracking-widest uppercase opacity-70 mb-3">
                      이 박스에 들어있는 팩
                      <span className="ml-2 opacity-50 normal-case tracking-normal text-xs">
                        {childPacks.length}
                      </span>
                    </h2>
                    <RelatedGrid items={childPacks} historyByCard={relatedHistByCard} />
                  </section>
                )}
                {allSingles.length > 0 && (
                  <section className="mt-10">
                    <h2 className="text-sm font-semibold tracking-widest uppercase opacity-70 mb-3">
                      이 박스에서 나오는 카드
                      <span className="ml-2 opacity-50 normal-case tracking-normal text-xs">
                        {allSingles.length}
                      </span>
                    </h2>
                    <RelatedGrid items={allSingles} historyByCard={relatedHistByCard} />
                  </section>
                )}
              </>
            );
          })()}
        </>
      )}

      {/* 팩 시세는 그 팩에서 나오는 카드 (=자식 싱글) */}
      {card.product_type === "pack" && children.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold tracking-widest uppercase opacity-70 mb-3">
            이 팩에서 나오는 카드
            <span className="ml-2 opacity-50 normal-case tracking-normal text-xs">
              {children.length}
            </span>
          </h2>
          <RelatedGrid items={children} historyByCard={relatedHistByCard} />
        </section>
      )}

      {/* 형제 — single 시세에서만 (박스/팩은 children/grandchildren 으로 이미 노출) */}
      {card.product_type === "single" && siblings.length > 0 && parent && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold tracking-widest uppercase opacity-70 mb-3">
            같은 박스의 다른 카드
            <span className="ml-2 opacity-50 normal-case tracking-normal text-xs">
              {siblings.length}
            </span>
            <span className="ml-2 opacity-50 normal-case tracking-normal text-xs">
              · {parent.name}
            </span>
          </h2>
          <RelatedGrid items={siblings} historyByCard={relatedHistByCard} />
        </section>
      )}

      {/* 시세 추이 차트 — 데이터 완성 시 노출 */}
      {SHOW_PRICE && false /* MarketChart 비활성 */ && null}

      {/* 관련 매물 (listings) */}
      {listings.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold tracking-widest uppercase opacity-70 mb-3">
            관련 매물
          </h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {listings.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/shop/${l.short_id ?? l.id}`}
                  className="block rounded-xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden group"
                >
                  <div className="aspect-square relative bg-white">
                    {l.image_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={safeImageUrl(l.image_url)!}
                        alt={l.title}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-contain p-3 group-hover:scale-[1.03] transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs opacity-40">
                        no image
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-[12px] font-semibold line-clamp-1">
                      {l.title_en || l.title}
                    </p>
                    <p className="text-[14px] font-extrabold mt-1 tracking-tight">
                      {formatUSD(l.price_usd)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 전체 기록 테이블 — 데이터 완성 시 노출 */}
      {SHOW_PRICE && false && null}
    </div>
  );
}

function RelatedGrid({
  items,
  historyByCard,
}: {
  items: MarketCard[];
  historyByCard: Map<string, MarketPriceRow[]>;
}) {
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-3 gap-y-6">
      {items.map((c) => {
        const top = latestByGrade(historyByCard.get(c.id) ?? [])[0];
        const ch = top ? priceChangePct(top.latest, top.prev) : null;
        return (
          <li key={c.id}>
            <Link href={marketCardHref(c)} className="block group">
              <div className="rounded-xl overflow-hidden bg-[var(--surface)] border border-[var(--border)]">
                <div className="aspect-square relative bg-white">
                  {c.image_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={safeImageUrl(c.image_url)!}
                      alt={c.name}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-contain p-3 group-hover:scale-[1.03] transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs opacity-40">
                      no image
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-2 px-0.5">
                {(c.set_name || c.rarity) && (
                  <p className="text-[10px] tracking-widest uppercase opacity-50 truncate">
                    {[c.set_name, c.rarity].filter(Boolean).join(" · ")}
                  </p>
                )}
                <p className="text-[13px] font-bold leading-snug line-clamp-1 mt-0.5">
                  {c.name}
                </p>
                {SHOW_PRICE && top && (
                  <div className="mt-1 flex items-baseline gap-2">
                    <p className="text-[14px] font-extrabold tracking-tight">
                      {formatKRW(top.latest)}
                    </p>
                    {ch && (
                      <span
                        className={`text-[11px] font-semibold ${
                          ch.dir === "up"
                            ? "text-red-600"
                            : ch.dir === "down"
                              ? "text-blue-600"
                              : "opacity-50"
                        }`}
                      >
                        {ch.dir === "up" ? "▲" : ch.dir === "down" ? "▼" : "·"}{" "}
                        {Math.abs(ch.pct).toFixed(1)}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
