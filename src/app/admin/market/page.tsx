export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createSsrClient } from "@/lib/supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";
import { type MarketCard, type MarketPriceRow } from "@/lib/market";
import NewMarketCardForm from "./new-market-form";
import BulkImportForm from "./import-form";
import {
  DeleteMarketButton,
  ImageThumb,
  InlineCategory,
  InlineParent,
  InlineProductType,
  InlineText,
  PriceHistoryPanel,
  ToggleActiveButton,
} from "./row-actions";

export default async function AdminMarketPage() {
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-xl font-bold mb-2">접근 권한 없음</h1>
        <p className="text-sm opacity-60">관리자만 접근 가능합니다.</p>
      </div>
    );
  }

  const admin = createServerClient();
  const [{ data: cardRows }, { data: historyRows }, { data: setRows }] = await Promise.all([
    admin
      .from("market_cards")
      .select("*")
      .order("is_active", { ascending: false })
      .order("category", { ascending: true })
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false }),
    admin
      .from("market_price_history")
      .select("*")
      .order("recorded_at", { ascending: false })
      .limit(2000),
    admin
      .from("sets")
      .select("id, name, name_ja, release_date, region")
      .eq("region", "kr")
      .order("release_date", { ascending: false }),
  ]);

  // 세트별 카드 수 — cards 테이블 단일 쿼리(in)로
  type SetRow = {
    id: string;
    name: string;
    name_ja: string | null;
    release_date: string | null;
    region: string | null;
  };
  const krSets = (setRows ?? []) as SetRow[];
  const setCardCounts = new Map<string, number>();
  if (krSets.length > 0) {
    const { data: catalogRows } = await admin
      .from("cards")
      .select("set_id")
      .in("set_id", krSets.map((s) => s.id));
    for (const r of (catalogRows ?? []) as { set_id: string }[]) {
      setCardCounts.set(r.set_id, (setCardCounts.get(r.set_id) ?? 0) + 1);
    }
  }
  const setsForImport = krSets.map((s) => ({
    id: s.id,
    name: s.name_ja || s.name,
    release_date: s.release_date,
    region: s.region,
    cardCount: setCardCounts.get(s.id) ?? 0,
  }));
  const cards = (cardRows ?? []) as MarketCard[];
  const history = (historyRows ?? []) as MarketPriceRow[];

  // 부모 picker용 옵션 (활성 박스/팩만)
  const parentOptions = cards
    .filter((c) => c.is_active && (c.product_type === "box" || c.product_type === "pack"))
    .map((c) => ({
      id: c.id,
      name: c.name,
      product_type: c.product_type,
      category: c.category,
    }));
  const historyByCard = new Map<string, MarketPriceRow[]>();
  for (const r of history) {
    const arr = historyByCard.get(r.card_id) ?? [];
    arr.push(r);
    historyByCard.set(r.card_id, arr);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">시세 관리</h1>
        <p className="text-xs opacity-50">{cards.length}장 등록</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <NewMarketCardForm parentOptions={parentOptions} />
        <BulkImportForm sets={setsForImport} />
      </div>

      <h2 className="text-sm font-semibold mt-8 mb-3">등록 카드</h2>

      <div className="space-y-3">
        {cards.length === 0 && (
          <p className="text-center text-xs opacity-50 py-8">등록된 시세 카드가 없습니다.</p>
        )}
        {cards.map((c) => (
          <div
            key={c.id}
            className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-3"
          >
            <div className="flex items-start gap-3">
              <ImageThumb src={c.image_url} alt={c.name} />
              <div className="flex-1 min-w-0">
                {/* 1행: 카테고리 + 타입 + 이름 + 액션 */}
                <div className="flex flex-wrap items-center gap-2">
                  <InlineCategory id={c.id} initial={c.category} />
                  <InlineProductType id={c.id} initial={c.product_type} />
                  <InlineText id={c.id} field="name" initial={c.name} placeholder="이름" className="font-semibold flex-1 min-w-[120px]" />
                  <ToggleActiveButton id={c.id} active={c.is_active} />
                  <DeleteMarketButton id={c.id} />
                </div>
                {/* 2행: 부모 + 영문 / 세트 / 등급 */}
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <InlineParent
                    id={c.id}
                    initialParentId={c.parent_id}
                    productType={c.product_type}
                    category={c.category}
                    parentOptions={parentOptions}
                  />
                  <InlineText id={c.id} field="name_en" initial={c.name_en} placeholder="영문 (선택)" className="opacity-70 max-w-[180px]" />
                  <InlineText id={c.id} field="set_name" initial={c.set_name} placeholder="세트명" className="opacity-70 max-w-[180px]" />
                  <InlineText id={c.id} field="rarity" initial={c.rarity} placeholder="등급/레어" className="opacity-70 max-w-[120px]" />
                </div>
              </div>
            </div>

            {/* 가격 history 패널 */}
            <PriceHistoryPanel
              cardId={c.id}
              history={historyByCard.get(c.id) ?? []}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
