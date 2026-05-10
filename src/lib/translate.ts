const GOOGLE_TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single";

function isKorean(text: string): boolean {
  return /[\uAC00-\uD7AF]/.test(text);
}

async function translateText(
  text: string,
  from: string,
  to: string
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      client: "gtx",
      sl: from,
      tl: to,
      dt: "t",
      q: text,
    });
    const resp = await fetch(`${GOOGLE_TRANSLATE_URL}?${params}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data?.[0]?.[0]?.[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * 한글 검색어를 영어/일본어로 번역하여 검색 키워드 배열을 반환합니다.
 * 한글이 아닌 경우 원본만 반환합니다.
 */
export async function expandSearchQuery(query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  if (!isKorean(trimmed)) {
    return [trimmed];
  }

  // 한글 → 영어, 일본어 동시 번역
  const [en, ja] = await Promise.all([
    translateText(trimmed, "ko", "en"),
    translateText(trimmed, "ko", "ja"),
  ]);

  const results = [trimmed];
  if (en) results.push(en);
  if (ja) results.push(ja);

  return results;
}
