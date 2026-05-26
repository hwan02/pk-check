export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createSsrClient } from "@/lib/supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";
import { type MarketCard, type MarketPriceRow } from "@/lib/market";
import NewMarketCardForm from "./new-market-form";
import BulkImportForm from "./import-form";
import AdminMarketCardList from "./card-list";

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

  // PostgREST max-rows 가 1000 으로 cap 되어 있어서 .range(0, 9999) 로 한방에 못 가져옴.
  // 페이지네이션해서 모든 market_cards 를 가져오기.
  async function fetchAllMarketCards(): Promise<MarketCard[]> {
    const PAGE = 1000;
    const out: MarketCard[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await admin
        .from("market_cards")
        .select("*")
        .order("is_active", { ascending: false })
        .order("category", { ascending: true })
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false })
        .range(from, from + PAGE - 1);
      if (error) break;
      const rows = (data ?? []) as MarketCard[];
      out.push(...rows);
      if (rows.length < PAGE) break;
      if (out.length >= 20000) break; // 안전장치
    }
    return out;
  }

  const [cardsAll, { data: historyRows }, { data: setRows }] = await Promise.all([
    fetchAllMarketCards(),
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
  const cards = cardsAll;
  const history = (historyRows ?? []) as MarketPriceRow[];

  // 부모 picker용 옵션 (박스/팩 모두 — 활성 여부 무관, 비활성은 라벨에 표시)
  const parentOptions = cards
    .filter((c) => c.product_type === "box" || c.product_type === "pack")
    .map((c) => ({
      id: c.id,
      name: c.name,
      product_type: c.product_type,
      category: c.category,
      is_active: c.is_active,
    }));
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Hit 관리</h1>
        <p className="text-xs opacity-50">{cards.length}장 등록</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <NewMarketCardForm parentOptions={parentOptions} />
        <BulkImportForm sets={setsForImport} />
      </div>

      <AdminMarketCardList
        cards={cards}
        history={history}
        parentOptions={parentOptions}
      />
    </div>
  );
}
