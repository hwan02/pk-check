/**
 * pokemoncard.co.kr 한국 공식 사이트 스크래퍼
 * 카드 목록 + 상세 정보 + 이미지 가져오기
 */

const BASE_URL = "https://pokemoncard.co.kr";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
};

export interface KrCard {
  krId: string;          // BS2026003022
  name: string;          // 메가개굴닌자 ex
  number: string;        // 022/083
  rarity: string;        // RR
  hp: string;            // 350
  artist: string;        // takuyoa
  cardType: string;      // 2진화 포켓몬 | 메가진화 ex
  imageUrl: string;      // https://cards.image.pokemonkorea.co.kr/...
}

export async function fetchKrCardIds(): Promise<string[]> {
  const resp = await fetch(`${BASE_URL}/cards`, {
    headers: HEADERS,
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) return [];
  const text = await resp.text();
  const ids = [...text.matchAll(/\/cards\/detail\/([A-Za-z0-9]+)/g)].map((m) => m[1]);
  return [...new Set(ids)];
}

export async function fetchKrCardDetail(krId: string): Promise<KrCard | null> {
  try {
    const resp = await fetch(`${BASE_URL}/cards/detail/${krId}`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return null;
    const text = await resp.text();

    // 카드 이미지
    const imgMatch = text.match(
      /https:\/\/cards\.image\.pokemonkorea\.co\.kr\/data\/wmimages\/[^"?]+/
    );
    const imageUrl = imgMatch ? imgMatch[0] : "";

    // feature_image 이후 텍스트에서 카드 정보 추출
    const idx = text.indexOf("feature_image");
    if (idx < 0) return null;

    const chunk = text.slice(idx, idx + 3000);
    const texts = [...chunk.matchAll(/>([^<]{1,200})</g)]
      .map((m) => m[1].trim())
      .filter(Boolean);

    // 패턴: [번호/총, 레어리티, "일러스트", 아티스트, 카드명, HP, 카드종류, ...]
    let number = "";
    let rarity = "";
    let artist = "";
    let name = "";
    let hp = "";
    let cardType = "";

    for (let i = 0; i < texts.length; i++) {
      const t = texts[i];
      if (/^\d{1,3}\/\d{1,3}$/.test(t)) {
        number = t;
        // 다음은 레어리티
        if (i + 1 < texts.length && /^[A-Z]{1,4}$/.test(texts[i + 1])) {
          rarity = texts[i + 1];
        }
      }
      if (t === "일러스트" && i + 1 < texts.length) {
        artist = texts[i + 1];
        // 아티스트 다음이 카드명
        if (i + 2 < texts.length) {
          name = texts[i + 2];
        }
      }
      if (t.startsWith("HP") && /^HP\d+$/.test(t)) {
        hp = t.replace("HP", "");
      }
      if (t.startsWith("카드 종류")) {
        cardType = t.replace("카드 종류 : ", "").trim();
      }
    }

    if (!name) return null;

    return { krId, name, number, rarity, hp, artist, cardType, imageUrl };
  } catch {
    return null;
  }
}
