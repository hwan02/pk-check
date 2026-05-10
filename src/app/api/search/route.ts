import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { ITEMS_PER_PAGE } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") ?? "";
  const rarity = searchParams.get("rarity") ?? "";
  const sort = searchParams.get("sort") ?? "name";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? String(ITEMS_PER_PAGE), 10));

  const supabase = createServerClient();

  let query = supabase
    .from("cards")
    .select("*, prices(*), set:sets(*)", { count: "exact" });

  if (q) {
    query = query.or(`name.ilike.%${q}%,name_ja.ilike.%${q}%`);
  }
  if (rarity) {
    query = query.eq("rarity", rarity);
  }

  switch (sort) {
    case "price_desc":
      query = query.order("tcg_market", { referencedTable: "prices", ascending: false, nullsFirst: false });
      break;
    case "price_asc":
      query = query.order("tcg_market", { referencedTable: "prices", ascending: true, nullsFirst: false });
      break;
    case "newest":
      query = query.order("updated_at", { ascending: false });
      break;
    default:
      query = query.order("name", { ascending: true });
  }

  const from = (page - 1) * limit;
  query = query.range(from, from + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const cards = (data ?? []).map((c) => ({
    ...c,
    prices: Array.isArray(c.prices) ? c.prices[0] ?? null : c.prices ?? null,
    set: Array.isArray(c.set) ? c.set[0] ?? null : c.set ?? null,
  }));

  return NextResponse.json({
    cards,
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / limit),
  });
}
