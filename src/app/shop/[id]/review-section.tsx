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

function StarRow({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const cls = size === "lg" ? "text-xl" : size === "md" ? "text-base" : "text-sm";
  return (
    <span className={`${cls} leading-none tracking-tighter`}>
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
  const avg = Number(stats?.avg_rating ?? 0);
  const count = stats?.review_count ?? 0;

  return (
    <section className="mt-16">
      <header className="flex items-end justify-between gap-3 mb-6 pb-4 border-b border-[var(--border)]">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase opacity-50">REVIEWS</p>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight mt-1">상품 후기</h2>
        </div>
        {count > 0 && (
          <p className="text-xs opacity-60">{count}개의 후기</p>
        )}
      </header>

      {/* 평균/분포 + 작성 폼 — 2 컬럼 */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-5 lg:gap-8 mb-10">
        {/* LEFT: 요약 */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
          {count === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-10">
              <StarRow rating={0} size="lg" />
              <p className="text-sm opacity-60 mt-3">아직 등록된 후기가 없어요</p>
              <p className="text-xs opacity-50 mt-1">첫 후기를 남겨주세요</p>
            </div>
          ) : (
            <div className="flex gap-6 items-stretch">
              <div className="text-center flex flex-col justify-center min-w-[110px]">
                <p className="text-5xl font-black tracking-tight">{avg.toFixed(1)}</p>
                <div className="mt-2"><StarRow rating={Math.round(avg)} size="md" /></div>
                <p className="text-[11px] opacity-50 mt-2">{count}개의 후기</p>
              </div>
              <div className="flex-1 space-y-2 self-center">
                {ratingBreakdown(reviews).map((b) => (
                  <div key={b.rating} className="flex items-center gap-2 text-xs">
                    <span className="w-3 text-right font-medium opacity-70">{b.rating}</span>
                    <span className="text-yellow-500 text-[11px]">★</span>
                    <div className="flex-1 h-2 bg-[var(--surface)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 rounded-full transition-all"
                        style={{ width: `${b.pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right opacity-60 tabular-nums">{b.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: 작성 폼 / 로그인 안내 */}
        <div>
          {user ? (
            <ReviewForm
              listingId={listingId}
              listingSlug={listingSlug}
              existing={myReview ? { rating: myReview.rating, body: myReview.body, photoUrls: myReview.photo_urls } : null}
            />
          ) : (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8 text-center h-full flex flex-col items-center justify-center">
              <p className="text-sm opacity-80 mb-3">로그인하고 후기를 남겨보세요</p>
              <Link
                href="/login"
                className="inline-block px-5 py-2 rounded-full bg-[var(--primary)] text-white text-sm font-semibold"
              >
                로그인
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* 후기 목록 */}
      {reviews.length > 0 && (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myReview && <ReviewItem key={myReview.id} review={myReview} ownReview listingSlug={listingSlug} />}
          {others.map((r) => (
            <ReviewItem key={r.id} review={r} listingSlug={listingSlug} />
          ))}
        </ul>
      )}
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
    <li className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 hover:border-[var(--border-strong)] transition-colors">
      <div className="flex items-center gap-2 mb-3">
        <StarRow rating={review.rating} />
        <span className="text-xs opacity-50">·</span>
        <span className="text-sm font-semibold">{maskName(review.author_label)}</span>
        {review.is_verified && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 font-bold">
            ✓ 구매 인증
          </span>
        )}
        <span className="text-[11px] opacity-50 ml-auto">{formatDate(review.created_at)}</span>
        {ownReview && (
          <ReviewDeleteButton reviewId={review.id} listingSlug={listingSlug} />
        )}
      </div>
      {review.body && (
        <p className="text-sm whitespace-pre-line leading-relaxed opacity-90">{review.body}</p>
      )}
      {review.photo_urls.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {review.photo_urls.map((url) => (
            <div
              key={url}
              className="relative w-24 h-24 rounded-xl overflow-hidden border border-[var(--border)] bg-white"
            >
              <Image src={url} alt="" fill className="object-cover" sizes="96px" />
            </div>
          ))}
        </div>
      )}
    </li>
  );
}
