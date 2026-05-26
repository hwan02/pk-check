/**
 * onepiece-jp 스크래퍼 동작 확인:
 * 1) 시리즈 목록 헤드 표시
 * 2) 최신 부스터 (OP-16) 카드 일부 표시 + 이미지 URL HEAD 체크
 */

import { fetchSeriesList, fetchSeriesCards } from "../src/lib/onepiece-jp";

async function main() {
  console.log("[1] 시리즈 목록");
  const series = await fetchSeriesList();
  console.log(`  총 ${series.length} 종`);
  for (const s of series.slice(0, 10)) {
    console.log(`  - [${s.type}] ${s.code ?? "?"}  ${s.name}  (value=${s.value})`);
  }
  console.log("  ...");

  const op16 = series.find((s) => s.code === "OP-16") ?? series[0];
  console.log(`\n[2] ${op16.code} (${op16.name}) 카드`);
  const cards = await fetchSeriesCards(op16.value);
  console.log(`  총 ${cards.length} 장`);
  for (const c of cards.slice(0, 5)) {
    console.log(`  - ${c.id} [${c.rarity}/${c.category}] ${c.name}`);
    console.log(`      color=${c.color} power=${c.power} counter=${c.counter} life=${c.life} cost=${c.cost} attr=${c.attribute}`);
    console.log(`      feature=${c.feature}`);
    console.log(`      text=${c.text.slice(0, 80)}${c.text.length > 80 ? "..." : ""}`);
    console.log(`      img=${c.imageUrl}`);
  }

  // 이미지 1개 HEAD 체크
  if (cards[0]?.imageUrl) {
    const r = await fetch(cards[0].imageUrl, { method: "HEAD" });
    console.log(`\n[3] 이미지 HEAD ${cards[0].imageUrl} → ${r.status} ${r.headers.get("content-type")}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
