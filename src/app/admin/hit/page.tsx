export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createSsrClient } from "@/lib/supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";
import { type MarketCard, type MarketPriceRow } from "@/lib/market";
import NewMarketCardForm from "./new-market-form";
import BulkImportForm from "./import-form";
import AdminMarketCardList from "./card-list";

interface PageProps {
  searchParams: Promise<{ show?: string }>;
}

export default async function AdminMarketPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const includeHidden = params.show === "all";

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

  // PostgREST max-rows 가 1000 으로 cap 되어 있어서 .range 로 페이지네이션.
  // 기본은 is_active=true 만 로드 (5000+ 전체 로드 시 느림).
  async function fetchAllMarketCards(): Promise<MarketCard[]> {
    const PAGE = 1000;
    const out: MarketCard[] = [];
    for (let from = 0; ; from += PAGE) {
      let q = admin
        .from("market_cards")
        .select("*")
        .order("is_active", { ascending: false })
        .order("category", { ascending: true })
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false })
        .range(from, from + PAGE - 1);
      if (!includeHidden) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) break;
      const rows = (data ?? []) as MarketCard[];
      out.push(...rows);
      if (rows.length < PAGE) break;
      if (out.length >= 20000) break; // 안전장치
    }
    return out;
  }

  const [cardsAll, { data: historyRows }, { data: setRows }, { data: allBoxPack }] = await Promise.all([
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
    // 부모 picker 용 — 활성 여부 무관 박스/팩 전부 (가벼움, 박스 73 + 팩 22 = 95개)
    admin
      .from("market_cards")
      .select("id, name, product_type, category, is_active")
      .in("product_type", ["box", "pack"])
      .order("category")
      .order("display_order"),
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

  // 부모 picker용 옵션 — 별도 가벼운 쿼리에서 가져옴 (비활성 박스/팩도 부모 후보로 선택 가능)
  const parentOptions = (allBoxPack ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    product_type: c.product_type as "box" | "pack",
    category: c.category as "pokemon" | "onepiece",
    is_active: c.is_active as boolean,
  }));
  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold tracking-tight">HIT 관리</h1>
        <div className="flex items-center gap-3 text-xs">
          <span className="opacity-50">
            {cards.length}장 표시 {includeHidden ? "(전체)" : "(활성만)"}
          </span>
          <Link
            href={includeHidden ? "/admin/hit" : "/admin/hit?show=all"}
            className="px-3 py-1.5 rounded-full border border-[var(--border)] hover:bg-[var(--surface)] font-semibold"
          >
            {includeHidden ? "활성만 보기" : "숨김 카드도 보기"}
          </Link>
        </div>
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
