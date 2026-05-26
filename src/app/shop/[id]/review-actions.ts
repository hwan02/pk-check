"use server";

import { revalidatePath } from "next/cache";
import { createSsrClient } from "@/lib/supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";
import { hasUserPurchased } from "@/lib/reviews";

interface SubmitInput {
  listingId: string;
  listingSlug: string;          // /shop/[id] revalidate 경로
  rating: number;               // 1~5
  body: string;
  photoUrls: string[];          // 업로드 API 가 반환한 public URL 들
}

interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function submitReview(input: SubmitInput): Promise<ActionResult> {
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };

  const rating = Math.round(input.rating);
  if (rating < 1 || rating > 5) return { ok: false, error: "별점은 1~5 사이여야 해요" };
  const body = (input.body ?? "").trim();
  if (body.length === 0 && input.photoUrls.length === 0) {
    return { ok: false, error: "텍스트 또는 사진 중 하나는 있어야 해요" };
  }
  if (body.length > 4000) return { ok: false, error: "후기가 너무 길어요 (4000자 이하)" };

  // 구매 인증
  const verified = await hasUserPurchased(supabase, user.id, input.listingId);

  // service-role 로 insert (is_verified 는 서버에서만 결정)
  const admin = createServerClient();

  // 프로필 이름으로 표시명 생성 (privacy mask)
  const { data: profile } = await admin
    .from("profiles")
    .select("name, email")
    .eq("id", user.id)
    .maybeSingle();
  const authorLabel = makeAuthorLabel(profile?.name ?? null, profile?.email ?? user.email ?? null);

  const { error } = await admin.from("listing_reviews").upsert(
    {
      listing_id: input.listingId,
      user_id: user.id,
      rating,
      body,
      photo_urls: input.photoUrls,
      is_verified: verified,
      is_seed: false,
      author_label: authorLabel,
      is_visible: true,
    },
    { onConflict: "listing_id,user_id" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/shop/${input.listingSlug}`);
  return { ok: true };
}

/**
 * "김승환" → "김O환" / "ssh.suh" → "ssh***" 식 마스킹.
 * 이름이 있으면 이름을, 없으면 이메일 로컬 파트를 마스킹.
 */
function makeAuthorLabel(name: string | null, email: string | null): string {
  if (name && name.trim()) {
    const trimmed = name.trim();
    if (trimmed.length <= 1) return trimmed;
    if (trimmed.length === 2) return `${trimmed[0]}*`;
    return `${trimmed[0]}${"O".repeat(trimmed.length - 2)}${trimmed[trimmed.length - 1]}`;
  }
  if (email) {
    const local = email.split("@")[0];
    if (local.length <= 3) return `${local[0] ?? ""}***`;
    return `${local.slice(0, 3)}***`;
  }
  return "익명";
}

export async function deleteOwnReview(reviewId: string, listingSlug: string): Promise<ActionResult> {
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };

  // RLS 가 본인 행만 삭제 허용
  const { error } = await supabase.from("listing_reviews").delete().eq("id", reviewId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/shop/${listingSlug}`);
  return { ok: true };
}
