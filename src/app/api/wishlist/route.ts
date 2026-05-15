import { NextResponse } from "next/server";
import { createSsrClient } from "@/lib/supabase/ssr";

export async function GET() {
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { data, error } = await supabase
    .from("wishlists")
    .select("id, listing_id, created_at, listing:listings(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

// 토글: 있으면 삭제, 없으면 추가
export async function POST(request: Request) {
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const listingId = typeof body.listing_id === "string" ? body.listing_id : null;
  if (!listingId) return NextResponse.json({ error: "listing_id 필요" }, { status: 400 });

  const { data: existing } = await supabase
    .from("wishlists")
    .select("id")
    .eq("user_id", user.id)
    .eq("listing_id", listingId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("wishlists")
      .delete()
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ wishlisted: false });
  }

  const { error } = await supabase
    .from("wishlists")
    .insert({ user_id: user.id, listing_id: listingId });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ wishlisted: true });
}
