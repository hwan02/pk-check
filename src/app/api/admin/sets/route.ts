import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

const BUCKET = "set-images";
const VALID_REGIONS = ["en", "jp", "kr"];

/**
 * 신규 세트 생성 (수동).
 * multipart/form-data:
 *   - name (required)
 *   - region (required: en|jp|kr)
 *   - name_ja, series, printed_total, release_date, snkrdunk_box_price (optional)
 *   - logo_file 또는 logo_url (둘 중 하나, 선택)
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();

  const name = (form.get("name") as string | null)?.trim() ?? "";
  const region = (form.get("region") as string | null)?.trim() ?? "";

  if (!name) return NextResponse.json({ error: "name 필수" }, { status: 400 });
  if (!VALID_REGIONS.includes(region)) return NextResponse.json({ error: "region은 en/jp/kr" }, { status: 400 });

  const supabase = createServerClient();

  // ID 생성: region-slug-timestamp (slug는 영숫자+한자만)
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9가-힯ぁ-んァ-ヴー一-鿿]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const setId = `${region}-${baseSlug || "set"}-${Date.now()}`;

  // optional fields
  const name_ja = (form.get("name_ja") as string | null)?.trim() || null;
  const series = (form.get("series") as string | null)?.trim() || null;
  const printedTotalRaw = (form.get("printed_total") as string | null)?.trim() || "";
  const printed_total = printedTotalRaw && /^\d{1,4}$/.test(printedTotalRaw) ? parseInt(printedTotalRaw, 10) : null;
  const release_date = (form.get("release_date") as string | null)?.trim() || null;
  const boxPriceRaw = (form.get("snkrdunk_box_price") as string | null)?.trim() || "";
  const snkrdunk_box_price = boxPriceRaw && /^\d{1,9}$/.test(boxPriceRaw) ? parseInt(boxPriceRaw, 10) : null;
  const externalLogo = (form.get("logo_url") as string | null)?.trim() || "";

  // 이미지 처리
  let logo_url: string | null = null;
  const file = form.get("logo_file") as File | null;
  if (file && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "이미지 5MB 초과" }, { status: 400 });
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return NextResponse.json({ error: "PNG/JPEG/WEBP만" }, { status: 400 });
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${setId}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, buf, {
      contentType: file.type,
      upsert: true,
    });
    if (upErr) return NextResponse.json({ error: `업로드: ${upErr.message}` }, { status: 500 });
    logo_url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } else if (externalLogo) {
    if (!/^https?:\/\//.test(externalLogo)) return NextResponse.json({ error: "logo_url은 http(s)" }, { status: 400 });
    logo_url = externalLogo;
  }

  const { error } = await supabase.from("sets").insert({
    id: setId,
    name,
    name_ja: name_ja ?? name,
    series,
    printed_total,
    release_date,
    logo_url,
    symbol_url: null,
    region,
    snkrdunk_box_price,
    snkrdunk_box_title: null,
    updated_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, setId });
}
