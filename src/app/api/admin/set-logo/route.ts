import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

const BUCKET = "set-images";

/**
 * 세트 로고 업데이트.
 * POST multipart/form-data: { setId, file? , url? }
 *  - file이 있으면 Supabase Storage에 업로드 후 public URL을 logo_url에 저장
 *  - url이 있으면 그 URL을 logo_url에 직접 저장
 *  - 둘 다 없거나 빈 값이면 logo_url을 null로 (삭제)
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const setId = (form.get("setId") as string | null)?.trim();
  const file = form.get("file") as File | null;
  const url = (form.get("url") as string | null)?.trim() ?? "";

  if (!setId) {
    return NextResponse.json({ error: "setId required" }, { status: 400 });
  }

  const supabase = createServerClient();

  let logoUrl: string | null = null;
  if (file && file.size > 0) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${setId}-${Date.now()}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, buf, {
      contentType: file.type || "image/png",
      upsert: true,
    });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    logoUrl = pub.publicUrl;
  } else if (url) {
    logoUrl = url;
  }

  const { error } = await supabase.from("sets").update({ logo_url: logoUrl }).eq("id", setId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, logoUrl });
}
