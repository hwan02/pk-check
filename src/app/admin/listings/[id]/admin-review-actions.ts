"use server";

import { revalidatePath } from "next/cache";
import { createSsrClient } from "@/lib/supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";

interface ActionResult {
  ok: boolean;
  error?: string;
}

async function assertAdmin(): Promise<true | string> {
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "로그인 필요";
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") return "권한 없음";
  return true;
}

export async function createSeedReview(input: {
  listingId: string;
  rating: number;
  body: string;
  photoUrls: string[];
  authorLabel: string;
  isVerified: boolean;
}): Promise<ActionResult> {
  const auth = await assertAdmin();
  if (auth !== true) return { ok: false, error: auth };

  const rating = Math.round(input.rating);
  if (rating < 1 || rating > 5) return { ok: false, error: "별점 1~5" };
  const body = (input.body ?? "").trim();
  const label = (input.authorLabel ?? "").trim();
  if (!label) return { ok: false, error: "표시명을 입력해주세요" };

  const admin = createServerClient();
  const { error } = await admin.from("listing_reviews").insert({
    listing_id: input.listingId,
    user_id: null,
    rating,
    body,
    photo_urls: input.photoUrls,
    is_verified: input.isVerified,
    is_seed: true,
    author_label: label,
    is_visible: true,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/listings/${input.listingId}`);
  return { ok: true };
}

export async function toggleReviewVisibility(reviewId: string, listingId: string, visible: boolean): Promise<ActionResult> {
  const auth = await assertAdmin();
  if (auth !== true) return { ok: false, error: auth };

  const admin = createServerClient();
  const { error } = await admin.from("listing_reviews").update({ is_visible: visible }).eq("id", reviewId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/listings/${listingId}`);
  return { ok: true };
}

export async function deleteAnyReview(reviewId: string, listingId: string): Promise<ActionResult> {
  const auth = await assertAdmin();
  if (auth !== true) return { ok: false, error: auth };

  const admin = createServerClient();
  const { error } = await admin.from("listing_reviews").delete().eq("id", reviewId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/listings/${listingId}`);
  return { ok: true };
}
