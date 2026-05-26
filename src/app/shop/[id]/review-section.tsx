import Image from "next/image";
import Link from "next/link";
import { createSsrClient } from "@/lib/supabase/ssr";
import { fetchReviewsForListing, type ListingReview } from "@/lib/reviews";
import ReviewForm from "./review-form";
import ReviewDeleteButton from "./review-delete-button";

interface Props {
  listingId: string;
  listingSlug: string;
}

function StarRow({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const cls = size === "md" ? "text-base" : "text-sm";
  return (
    <span className={`${cls} leading-none`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= rating ? "text-yellow-500" : "text-[var(--border)]"}>
          ★
        </span>
      ))}
    </span>
  );
}

function maskName(label: string | null): string {
  if (!label) return "익명";
  return label;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("ko-KR");
}

function ratingBreakdown(reviews: ListingReview[]): { rating: number; count: number; pct: number }[] {
  const total = reviews.length;
  const buckets = [5, 4, 3, 2, 1].map((r) => ({
    rating: r,
    count: reviews.filter((x) => x.rating === r).length,
  }));
  return buckets.map((b) => ({ ...b, pct: total > 0 ? (b.count / total) * 100 : 0 }));
}

export default async function ReviewSection({ listingId, listingSlug }: Props) {
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { reviews, stats } = await fetchReviewsForListing(supabase, listingId);

  const myReview = user ? reviews.find((r) => r.user_id === user.id) ?? null : null;
  const others = reviews.filter((r) => r.id !== myReview?.id);
  const avg = stats?.avg_rating ?? 0;
  const count = stats?.review_count ?? 0;

  return (
    <section className="mt-12">
      <header className="mb-5">
        <h2 className="text-lg md:text-xl font-bold tracking-tight">상품 후기</h2>
      </header>

      {/* 평균/분포 요약 */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 mb-5">
        {count === 0 ? (
          <p className="text-sm opacity-60 text-center py-4">아직 등록된 후기가 없어요. 첫 후기를 남겨주세요.</p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-stretch">
            <div className="text-center sm:border-r sm:border-[var(--border)] sm:pr-5 min-w-[100px]">
              <p className="text-3xl font-extrabold tracking-tight">{Number(avg).toFixed(1)}</p>
              <StarRow rating={Math.round(avg)} size="md" />
              <p className="text-xs opacity-60 mt-1">{count}개의 후기</p>
            </div>
            <div className="flex-1 w-full space-y-1">
              {ratingBreakdown(reviews).map((b) => (
                <div key={b.rating} className="flex items-center gap-2 text-xs">
                  <span className="w-4 text-right">{b.rating}</span>
                  <span className="text-yellow-500">★</span>
                  <div className="flex-1 h-1.5 bg-[var(--surface)] rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-500" style={{ width: `${b.pct}%` }} />
                  </div>
                  <span className="w-8 text-right opacity-60">{b.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 폼 (로그인 유저만) */}
      {user ? (
        <ReviewForm
          listingId={listingId}
          listingSlug={listingSlug}
          existing={myReview ? { rating: myReview.rating, body: myReview.body, photoUrls: myReview.photo_urls } : null}
        />
      ) : (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 text-center text-sm">
          <Link href="/login" className="font-semibold underline">로그인</Link>
          <span className="opacity-70"> 하고 후기를 남겨보세요.</span>
        </div>
      )}

      {/* 후기 목록 */}
      <ul className="space-y-3 mt-5">
        {myReview && <ReviewItem key={myReview.id} review={myReview} ownReview listingSlug={listingSlug} />}
        {others.map((r) => (
          <ReviewItem key={r.id} review={r} listingSlug={listingSlug} />
        ))}
      </ul>
    </section>
  );
}

function ReviewItem({
  review,
  ownReview,
  listingSlug,
}: {
  review: ListingReview;
  ownReview?: boolean;
  listingSlug: string;
}) {
  return (
    <li className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <StarRow rating={review.rating} />
        <span className="text-xs font-semibold">{maskName(review.author_label)}</span>
        {review.is_verified && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 font-semibold">
            구매 인증
          </span>
        )}
        <span className="text-[10px] opacity-50 ml-auto">{formatDate(review.created_at)}</span>
        {ownReview && (
          <ReviewDeleteButton reviewId={review.id} listingSlug={listingSlug} />
        )}
      </div>
      {review.body && (
        <p className="text-sm whitespace-pre-line leading-relaxed">{review.body}</p>
      )}
      {review.photo_urls.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {review.photo_urls.map((url) => (
            <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden border border-[var(--border)]">
              <Image src={url} alt="" fill className="object-cover" sizes="80px" />
            </div>
          ))}
        </div>
      )}
    </li>
  );
}
