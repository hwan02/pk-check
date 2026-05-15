import { NextResponse } from "next/server";
import { createSsrClient } from "@/lib/supabase/ssr";

export async function PATCH(request: Request) {
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "이름을 입력하세요" }, { status: 400 });
  if (name.length > 50) {
    return NextResponse.json({ error: "이름은 50자 이내" }, { status: 400 });
  }

  const customsIdNo =
    typeof body.customs_id_no === "string" && body.customs_id_no.trim()
      ? body.customs_id_no.trim().toUpperCase()
      : null;
  if (customsIdNo && !/^P\d{12}$/.test(customsIdNo)) {
    return NextResponse.json(
      { error: "개인통관고유부호는 P + 숫자 12자리 형식입니다." },
      { status: 400 },
    );
  }

  const update: Record<string, string | null> = {
    name,
    customs_id_no: customsIdNo,
    phone: optStr(body.phone),
  };

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

function optStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}
