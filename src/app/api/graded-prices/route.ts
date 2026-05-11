import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET /api/graded-prices?cardId=xxx → 해당 카드 등급별 가격 히스토리 전체
export async function GET(request: NextRequest) {
  const cardId = request.nextUrl.searchParams.get("cardId");
  if (!cardId) {
    return NextResponse.json({ error: "cardId required" }, { status: 400 });
  }
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("graded_prices")
    .select("*")
    .eq("card_id", cardId)
    .order("recorded_at", { ascending: false })
    .order("id", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data ?? [] });
}

// POST /api/graded-prices  body: { cardId, company, grade, price, currency?, recorded_at?, note? }
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { cardId, company, grade, price, currency, recorded_at, note } = body;
  if (!cardId || !company || !grade || price == null) {
    return NextResponse.json({ error: "cardId, company, grade, price required" }, { status: 400 });
  }
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("graded_prices")
    .insert({
      card_id: cardId,
      company: String(company).trim().toUpperCase(),
      grade: String(grade).trim(),
      price: Number(price),
      currency: (currency ?? "KRW").toUpperCase(),
      recorded_at: recorded_at ?? new Date().toISOString().slice(0, 10),
      note: note ?? null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data });
}

// DELETE /api/graded-prices?id=N
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const supabase = createServerClient();
  const { error } = await supabase.from("graded_prices").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
