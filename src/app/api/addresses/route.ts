import { NextResponse } from "next/server";
import { createSsrClient } from "@/lib/supabase/ssr";
import { validateAddressInput } from "@/lib/addresses";

export async function GET() {
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { data, error } = await supabase
    .from("shipping_addresses")
    .select(
      "id, label, recipient_name, phone, country, postal_code, address1, address2, is_default, created_at",
    )
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ addresses: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = validateAddressInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const input = parsed.data;

  // 첫 배송지는 자동으로 default
  const { count } = await supabase
    .from("shipping_addresses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const makeDefault = input.is_default === true || (count ?? 0) === 0;

  const { data, error } = await supabase
    .from("shipping_addresses")
    .insert({
      user_id: user.id,
      label: input.label,
      recipient_name: input.recipient_name,
      phone: input.phone,
      country: input.country,
      postal_code: input.postal_code,
      address1: input.address1,
      address2: input.address2,
      is_default: makeDefault,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
