import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { cardId, snkrdunkUrl } = await request.json();
  if (!cardId || !snkrdunkUrl) {
    return NextResponse.json({ error: "cardId and snkrdunkUrl required" }, { status: 400 });
  }

  // snkrdunk 상품 페이지에서 이미지 추출
  try {
    const resp = await fetch(snkrdunkUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept-Language": "ja,en;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) {
      return NextResponse.json({ error: "snkrdunk 페이지 로드 실패" }, { status: 502 });
    }
    const text = await resp.text();
    const match = text.match(/https:\/\/cdn\.snkrdunk\.com\/upload_bg_removed\/[^"?\s]+/);
    if (!match) {
      return NextResponse.json({ error: "이미지를 찾을 수 없습니다" }, { status: 404 });
    }

    const imageUrl = match[0];
    const supabase = createServerClient();
    const { error } = await supabase
      .from("cards")
      .update({ image_small: imageUrl, image_large: imageUrl })
      .eq("id", cardId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, imageUrl });
  } catch {
    return NextResponse.json({ error: "네트워크 오류" }, { status: 500 });
  }
}
