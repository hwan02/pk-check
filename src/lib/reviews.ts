import type { SupabaseClient } from "@supabase/supabase-js";

export interface ListingReview {
  id: string;
  listing_id: string;
  user_id: string | null;
  rating: number;            // 1~5
  body: string;
  photo_urls: string[];
  is_verified: boolean;      // 구매 인증
  is_seed: boolean;          // 어드민 시드
  author_label: string | null;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface ListingReviewStats {
  listing_id: string;
  review_count: number;
  avg_rating: number;        // 0~5 (소수점 2자리)
}

/**
 * 한 listing 의 공개 후기 + 통계를 한 번에 가져옴.
 */
export async function fetchReviewsForListing(
  supabase: SupabaseClient,
  listingId: string,
): Promise<{ reviews: ListingReview[]; stats: ListingReviewStats | null }> {
  const [rRes, sRes] = await Promise.all([
    supabase
      .from("listing_reviews")
      .select("*")
      .eq("listing_id", listingId)
      .eq("is_visible", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("listing_review_stats")
      .select("*")
      .eq("listing_id", listingId)
      .maybeSingle(),
  ]);
  return {
    reviews: (rRes.data ?? []) as ListingReview[],
    stats: (sRes.data ?? null) as ListingReviewStats | null,
  };
}

/**
 * 여러 listing 의 통계를 묶어서 가져옴 (샵 그리드용).
 */
export async function fetchReviewStatsBulk(
  supabase: SupabaseClient,
  listingIds: string[],
): Promise<Map<string, ListingReviewStats>> {
  if (listingIds.length === 0) return new Map();
  const { data } = await supabase
    .from("listing_review_stats")
    .select("*")
    .in("listing_id", listingIds);
  const m = new Map<string, ListingReviewStats>();
  for (const r of (data ?? []) as ListingReviewStats[]) m.set(r.listing_id, r);
  return m;
}

/**
 * 한 user 가 한 listing 을 실제로 구매한 적 있는지 (구매 인증 배지 판단).
 * status in (paid, shipped, delivered) 인 주문에 해당 listing 이 있으면 true.
 */
export async function hasUserPurchased(
  supabase: SupabaseClient,
  userId: string,
  listingId: string,
): Promise<boolean> {
  // order_items.listing_id 가 일치하고, 부모 order 의 status 가 결제 완료된 것
  const { data } = await supabase
    .from("order_items")
    .select("id, orders!inner(user_id, status)")
    .eq("listing_id", listingId)
    .eq("orders.user_id", userId)
    .in("orders.status", ["paid", "shipped", "delivered"]) as unknown as { data: { id: string }[] | null };
  return (data?.length ?? 0) > 0;
}

export function ratingLabel(rating: number | null | undefined): string {
  if (rating == null) return "-";
  return rating.toFixed(rating % 1 === 0 ? 0 : 1);
}
