import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

const BUCKET = "card-images";
const VALID_REGIONS = ["en", "jp", "kr"];
const VALID_SUPERTYPES = ["Pokémon", "Trainer", "Energy"];

/**
 * 수동 카드 추가.
 * multipart/form-data:
 *   - name (required)
 *   - name_ja (optional)
 *   - region (required: en|jp|kr)
 *   - set_id (optional - 기존 세트 선택)
 *   - new_set_name (optional - 새 세트 만들 때 이름)
 *   - number (optional)
 *   - rarity (optional - 영문 정규명)
 *   - rarity_ja (optional - 약자)
 *   - supertype (optional: Pokémon|Trainer|Energy)
 *   - hp (optional)
 *   - types (optional - comma separated)
 *   - artist (optional)
 *   - image (optional - file)
 *   - image_url (optional - URL 직접 입력)
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();

  // 필수 검증
  const name = (form.get("name") as string | null)?.trim() ?? "";
  const region = (form.get("region") as string | null)?.trim() ?? "";

  if (!name) return NextResponse.json({ error: "name 필수" }, { status: 400 });
  if (!VALID_REGIONS.includes(region)) {
    return NextResponse.json({ error: "region은 en/jp/kr 중 하나" }, { status: 400 });
  }

  const supabase = createServerClient();

  // optional 필드
  const name_ja = (form.get("name_ja") as string | null)?.trim() || null;
  const number = (form.get("number") as string | null)?.trim() || null;
  const rarity = (form.get("rarity") as string | null)?.trim() || null;
  const rarity_ja = (form.get("rarity_ja") as string | null)?.trim() || null;
  const supertypeRaw = (form.get("supertype") as string | null)?.trim() || null;
  const supertype = supertypeRaw && VALID_SUPERTYPES.includes(supertypeRaw) ? supertypeRaw : null;
  const hpRaw = (form.get("hp") as string | null)?.trim() || "";
  const hp = hpRaw && /^\d{1,4}$/.test(hpRaw) ? hpRaw : null;
  const typesRaw = (form.get("types") as string | null)?.trim() || "";
  const types = typesRaw ? typesRaw.split(",").map((t) => t.trim()).filter(Boolean) : null;
  const artist = (form.get("artist") as string | null)?.trim() || null;
  const externalImageUrl = (form.get("image_url") as string | null)?.trim() || "";

  // 세트 처리: 기존 set_id 선택 / 새 세트 생성 / 미선택(custom)
  let setId = (form.get("set_id") as string | null)?.trim() || "";
  const newSetName = (form.get("new_set_name") as string | null)?.trim() || "";

  if (!setId && newSetName) {
    // 새 세트 생성
    const slug = newSetName
      .toLowerCase()
      .replace(/[^a-z0-9가-힯ぁ-んァ-ヴー一-鿿]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
    setId = `${region}-custom-${slug || Date.now()}`;
    const { error: setErr } = await supabase.from("sets").upsert(
      {
        id: setId,
        name: newSetName,
        name_ja: newSetName,
        series: "Custom",
        region,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (setErr) return NextResponse.json({ error: `세트 생성: ${setErr.message}` }, { status: 500 });
  } else if (!setId) {
    // 미선택 → custom 세트
    setId = "custom";
    await supabase.from("sets").upsert(
      { id: "custom", name: "수동 추가", name_ja: "手動追加", series: "Custom", region },
      { onConflict: "id" }
    );
  }

  // 이미지 처리: 파일 업로드 or URL
  let imageUrl: string | null = null;
  const file = form.get("image") as File | null;
  if (file && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "이미지 5MB 초과" }, { status: 400 });
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      return NextResponse.json({ error: "PNG/JPEG/WEBP만 허용" }, { status: 400 });
    }
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${region}-${Date.now()}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, buf, {
      contentType: file.type,
      upsert: false,
    });
    if (upErr) return NextResponse.json({ error: `업로드: ${upErr.message}` }, { status: 500 });
    imageUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } else if (externalImageUrl) {
    imageUrl = externalImageUrl;
  }

  // 카드 ID 생성
  const cardId = `manual-${region}-${Date.now()}`;

  const { error: cardErr } = await supabase.from("cards").insert({
    id: cardId,
    name,
    name_ja: name_ja ?? name,
    supertype,
    types,
    subtypes: null,
    hp,
    rarity,
    rarity_ja,
    set_id: setId,
    number,
    artist,
    attacks: null,
    weaknesses: null,
    resistances: null,
    retreat_cost: null,
    region,
    image_small: imageUrl,
    image_large: imageUrl,
    updated_at: new Date().toISOString(),
  });

  if (cardErr) return NextResponse.json({ error: cardErr.message }, { status: 500 });

  // 빈 prices row 생성
  await supabase.from("prices").upsert(
    { card_id: cardId, fetched_at: new Date().toISOString() },
    { onConflict: "card_id" }
  );

  return NextResponse.json({ ok: true, cardId });
}
