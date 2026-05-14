import { NextResponse } from "next/server";
import { createSsrClient } from "@/lib/supabase/ssr";

export async function GET() {
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { data: orders } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("user_id", user.id)
    .neq("status", "pending")
    .order("created_at", { ascending: false });

  return NextResponse.json({ orders: orders ?? [] });
}
