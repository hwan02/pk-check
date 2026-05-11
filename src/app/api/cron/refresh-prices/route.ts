import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getJapaneseName } from "@/lib/pokeapi";
import { buildSnkrdunkKeyword, searchSnkrdunk, searchSnkrdunkBox } from "@/lib/snkrdunk";

const POKEMON_TCG_API = "https://api.pokemontcg.io/v2";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const results = { tcgUpdated: 0, snkrdunkUpdated: 0, errors: 0 };

  try {
    // 1) Refresh TCGPlayer prices from Pokemon TCG API
    // Fetch cards with stale prices (older than 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: staleCards } = await supabase
      .from("prices")
      .select("card_id")
      .lt("fetched_at", oneDayAgo)
      .limit(500);

    if (staleCards?.length) {
      const cardIds = staleCards.map((c) => c.card_id);

      // Fetch updated card data from Pokemon TCG API in batches
      const batchSize = 50;
      for (let i = 0; i < cardIds.length; i += batchSize) {
        const batch = cardIds.slice(i, i + batchSize);
        const idQuery = batch.map((id) => `id:"${id}"`).join(" OR ");

        const headers: Record<string, string> = {};
        if (process.env.POKEMONTCG_API_KEY) {
          headers["X-Api-Key"] = process.env.POKEMONTCG_API_KEY;
        }

        try {
          const resp = await fetch(
            `${POKEMON_TCG_API}/cards?q=${encodeURIComponent(idQuery)}&pageSize=250`,
            { headers }
          );
          if (resp.ok) {
            const data = await resp.json();
            for (const card of data.data ?? []) {
              const prices = card.tcgplayer?.prices;
              if (!prices) continue;

              let market = null, low = null, mid = null, high = null;
              for (const type of ["normal", "holofoil", "reverseHolofoil", "1stEditionHolofoil"]) {
                if (prices[type]) {
                  market = prices[type].market ?? null;
                  low = prices[type].low ?? null;
                  mid = prices[type].mid ?? null;
                  high = prices[type].high ?? null;
                  break;
                }
              }

              await supabase
                .from("prices")
                .update({
                  tcg_market: market,
                  tcg_low: low,
                  tcg_mid: mid,
                  tcg_high: high,
                  fetched_at: new Date().toISOString(),
                })
                .eq("card_id", card.id);

              results.tcgUpdated++;
            }
          }
        } catch {
          results.errors++;
        }

        await sleep(500);
      }
    }

    // 2) Refresh snkrdunk prices for Pokemon cards without snkrdunk data
    //   - en: name이 영문 → PokeAPI로 일본어 변환 후 키워드 빌드
    //   - jp/kr: name_ja(또는 name)에 이미 CJK 포함 → 그대로 키워드 사용
    const { data: cardsToScrape } = await supabase
      .from("cards")
      .select("id, name, name_ja, rarity, region, prices(snkrdunk_price)")
      .eq("supertype", "Pokémon")
      .is("prices.snkrdunk_price", null)
      .limit(100);

    for (const card of cardsToScrape ?? []) {
      let keyword: string;
      if (card.region === "jp" || card.region === "kr") {
        // 한국판 이름은 일본어 시장에 없으니 name_ja(있으면)나 name 그대로
        const base = card.name_ja ?? card.name;
        if (!base || !/[぀-ゟ゠-ヿ一-鿿]/.test(base)) continue; // 일본어 없으면 검색 의미 없음
        // 영문/괄호 부분 제거 (예: "quagsire（デルタ種）" → "（デルタ種）"는 부족하니 fallback은 원본)
        const stripped = base.replace(/[A-Za-z0-9]+/g, "").trim();
        const meaningful = stripped.replace(/[（）()・〜~ー\s]/g, "");
        keyword = meaningful.length >= 2 ? stripped : base;
      } else {
        // en 카드: PokeAPI로 변환
        const jaName = await getJapaneseName(card.name);
        if (!jaName) continue;
        keyword = buildSnkrdunkKeyword(jaName, card.name, card.rarity);
      }

      const result = await searchSnkrdunk(keyword);

      if (result.price != null) {
        // upsert: prices row가 없는 카드도 새로 생성
        await supabase
          .from("prices")
          .upsert(
            {
              card_id: card.id,
              snkrdunk_price: result.price,
              snkrdunk_title: result.title,
              fetched_at: new Date().toISOString(),
            },
            { onConflict: "card_id" }
          );

        results.snkrdunkUpdated++;
      }

      await sleep(2000); // Rate limit for snkrdunk
    }

    // 3) Refresh box prices for jp sets without box price (snkrdunk = 일본 시장)
    const { data: setsToScrape } = await supabase
      .from("sets")
      .select("id, name")
      .eq("region", "jp")
      .is("snkrdunk_box_price", null)
      .limit(30);

    for (const set of setsToScrape ?? []) {
      const result = await searchSnkrdunkBox(set.name);
      if (result.price != null) {
        await supabase
          .from("sets")
          .update({
            snkrdunk_box_price: result.price,
            snkrdunk_box_title: result.title,
          })
          .eq("id", set.id);
      }
      await sleep(2000);
    }

    // 4) Record price history snapshot
    const { data: allPrices } = await supabase
      .from("prices")
      .select("card_id, tcg_market, snkrdunk_price")
      .or("tcg_market.not.is.null,snkrdunk_price.not.is.null");

    if (allPrices?.length) {
      const historyRows = allPrices.map((p) => ({
        card_id: p.card_id,
        tcg_market: p.tcg_market,
        snkrdunk_price: p.snkrdunk_price,
        recorded_at: new Date().toISOString().split("T")[0],
      }));

      // Upsert in batches (unique on card_id + recorded_at)
      for (let i = 0; i < historyRows.length; i += 500) {
        const batch = historyRows.slice(i, i + 500);
        await supabase
          .from("price_history")
          .upsert(batch, { onConflict: "card_id,recorded_at" });
      }
    }
  } catch (err) {
    console.error("Cron error:", err);
    results.errors++;
  }

  return NextResponse.json({
    ok: true,
    ...results,
    timestamp: new Date().toISOString(),
  });
}
