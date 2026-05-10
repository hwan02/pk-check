import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { cardId, password } = await request.json();
  if (!cardId) {
    return NextResponse.json({ error: "cardId required" }, { status: 400 });
  }
  if (password !== "포포123") {
    return NextResponse.json({ error: "비밀번호가 틀립니다" }, { status: 403 });
  }

  const supabase = createServerClient();

  // 가격 먼저 삭제 (FK 제약)
  await supabase.from("price_history").delete().eq("card_id", cardId);
  await supabase.from("prices").delete().eq("card_id", cardId);
  const { error } = await supabase.from("cards").delete().eq("id", cardId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
