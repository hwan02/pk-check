import { NextResponse } from "next/server";
import { createSsrClient } from "@/lib/supabase/ssr";
import { validateAddressInput } from "@/lib/addresses";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = validateAddressInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const input = parsed.data;

  const { error } = await supabase
    .from("shipping_addresses")
    .update({
      label: input.label,
      recipient_name: input.recipient_name,
      phone: input.phone,
      country: input.country,
      postal_code: input.postal_code,
      address1: input.address1,
      address2: input.address2,
      ...(input.is_default ? { is_default: true } : {}),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  // 삭제 대상이 default 였다면, 다른 배송지 중 가장 최근 것을 default 로 승격
  const { data: target } = await supabase
    .from("shipping_addresses")
    .select("id, is_default")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!target) return NextResponse.json({ error: "배송지를 찾을 수 없습니다" }, { status: 404 });

  const { error: delErr } = await supabase
    .from("shipping_addresses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  if (target.is_default) {
    const { data: next } = await supabase
      .from("shipping_addresses")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (next) {
      await supabase
        .from("shipping_addresses")
        .update({ is_default: true })
        .eq("id", next.id)
        .eq("user_id", user.id);
    }
  }

  return NextResponse.json({ ok: true });
}
