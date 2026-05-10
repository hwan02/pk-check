import { RARITY_MAP } from "./constants";

interface SnkrdunkResult {
  price: number | null;
  title: string | null;
  url: string | null;
}

type ParsedItem = { href: string; title: string; price: string };

function isBoxProduct(title: string): boolean {
  if (/\[[A-Za-z0-9-]+ \d+\/\d+\]/.test(title)) return false;
  if (/\[[A-Za-z0-9-]+ \d+\]/.test(title)) return false;
  const boxKeywords = ["ボックス", "BOX", "デッキ", "セット", "コレクション"];
  return boxKeywords.some((kw) => title.includes(kw));
}

function parseItems(html: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const regex = /href="(https:\/\/snkrdunk\.com\/apparels\/\d+)"[^>]*?aria-label="([^"]+?)\s*-\s*¥([\d,]+)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    items.push({ href: match[1], title: match[2], price: match[3] });
  }
  // fallback: aria-label only (no href)
  if (!items.length) {
    const fallback = /aria-label="([^"]+?)\s*-\s*¥([\d,]+)"/g;
    while ((match = fallback.exec(html)) !== null) {
      items.push({ href: "", title: match[1], price: match[2] });
    }
  }
  return items;
}

async function fetchSnkrdunk(keyword: string): Promise<ParsedItem[]> {
  const encoded = encodeURIComponent(keyword);
  const url = `https://snkrdunk.com/search?keyword=${encoded}&searchCategoryIds=6`;
  const resp = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Accept-Language": "ja,en;q=0.9",
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) return [];
  return parseItems(await resp.text());
}

export function buildSnkrdunkKeyword(
  jaName: string,
  englishName: string,
  rarity: string | null
): string {
  let suffix = "";
  for (const s of ["VSTAR", "VMAX", "GX", "EX", "ex", " V"]) {
    if (englishName.includes(s)) {
      suffix = s.trim();
      break;
    }
  }
  const rarityJa = rarity ? (RARITY_MAP[rarity] ?? "") : "";
  let keyword = jaName;
  if (suffix) keyword += suffix;
  if (rarityJa) keyword += ` ${rarityJa}`;
  return keyword;
}

export async function searchSnkrdunk(keyword: string): Promise<SnkrdunkResult> {
  try {
    const items = await fetchSnkrdunk(keyword);
    if (!items.length) return { price: null, title: null, url: null };

    const searchParts = keyword.split(" ");
    const pokemonName = searchParts[0];
    const rarityPart = searchParts[1] ?? "";
    const baseName = pokemonName.replace(/(ex|EX|V|VSTAR|VMAX|GX)$/, "");

    const match = (item: ParsedItem) => ({
      price: parseInt(item.price.replace(/,/g, "")),
      title: item.title,
      url: item.href || null,
    });

    // Priority 1: exact name + rarity (single card)
    if (rarityPart) {
      for (const item of items) {
        if (item.title.includes(pokemonName) && item.title.includes(rarityPart) && !isBoxProduct(item.title)) {
          return match(item);
        }
      }
    }
    // Priority 2: exact name (single card)
    for (const item of items) {
      if (item.title.includes(pokemonName) && !isBoxProduct(item.title)) {
        return match(item);
      }
    }
    // Priority 3: base name + rarity (single card)
    if (rarityPart && baseName !== pokemonName) {
      for (const item of items) {
        if (item.title.includes(baseName) && item.title.includes(rarityPart) && !isBoxProduct(item.title)) {
          return match(item);
        }
      }
    }
    // Priority 4: base name (single card)
    if (baseName !== pokemonName) {
      for (const item of items) {
        if (item.title.includes(baseName) && !isBoxProduct(item.title)) {
          return match(item);
        }
      }
    }
  } catch {
    // timeout or network error
  }
  return { price: null, title: null, url: null };
}

export async function searchSnkrdunkBox(setName: string): Promise<SnkrdunkResult> {
  try {
    const items = await fetchSnkrdunk(`ポケモンカード ${setName} ボックス`);
    for (const item of items) {
      if (isBoxProduct(item.title) && item.title.includes("ポケモン")) {
        return {
          price: parseInt(item.price.replace(/,/g, "")),
          title: item.title,
          url: item.href || null,
        };
      }
    }
  } catch {
    // timeout or network error
  }
  return { price: null, title: null, url: null };
}
