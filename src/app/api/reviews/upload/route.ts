import { NextRequest, NextResponse } from "next/server";
import { createSsrClient } from "@/lib/supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";

const BUCKET = "listing-images";
const MAX_PHOTOS = 5;
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 로그인 필수
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

  const form = await req.formData();
  const files = form.getAll("photos").filter((f): f is File => f instanceof File);
  if (files.length === 0) return NextResponse.json({ error: "사진이 없어요" }, { status: 400 });
  if (files.length > MAX_PHOTOS) {
    return NextResponse.json({ error: `최대 ${MAX_PHOTOS}장까지 가능해요` }, { status: 400 });
  }

  const admin = createServerClient();
  const urls: string[] = [];
  for (const f of files) {
    if (!ALLOWED.includes(f.type)) {
      return NextResponse.json({ error: `이미지 형식만 가능 (${ALLOWED.join(", ")})` }, { status: 400 });
    }
    if (f.size > MAX_SIZE) {
      return NextResponse.json({ error: "파일이 너무 커요 (최대 5MB)" }, { status: 400 });
    }
    const ext = f.type === "image/jpeg" ? "jpg" : f.type === "image/webp" ? "webp" : "png";
    const path = `reviews/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buf = Buffer.from(await f.arrayBuffer());
    const { error } = await admin.storage.from(BUCKET).upload(path, buf, {
      contentType: f.type,
      upsert: false,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    urls.push(admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
  }
  return NextResponse.json({ urls });
}
