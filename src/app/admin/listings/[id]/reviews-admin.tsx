import { createServerClient } from "@/lib/supabase/server";
import type { ListingReview } from "@/lib/reviews";
import SeedReviewForm from "./seed-review-form";
import ReviewAdminActions from "./review-admin-actions";

interface Props {
  listingId: string;
}

export default async function ReviewsAdmin({ listingId }: Props) {
  const db = createServerClient();
  const { data } = await db
    .from("listing_reviews")
    .select("*")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false });
  const reviews = (data ?? []) as ListingReview[];

  return (
    <section className="mt-12">
      <h2 className="text-lg font-bold mb-4">후기 관리 ({reviews.length})</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <SeedReviewForm listingId={listingId} />
        </div>
        <ul className="space-y-2">
          {reviews.length === 0 && (
            <li className="text-sm opacity-60 p-3">등록된 후기 없음</li>
          )}
          {reviews.map((r) => (
            <li key={r.id} className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-3">
              <div className="flex items-center gap-2 text-xs mb-1">
                <span className="text-yellow-500">{"★".repeat(r.rating)}</span>
                <span className="font-semibold">{r.author_label ?? "익명"}</span>
                {r.is_seed && <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-700 text-[10px]">시드</span>}
                {r.is_verified && <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 text-[10px]">구매인증</span>}
                {!r.is_visible && <span className="px-1.5 py-0.5 rounded bg-gray-500/15 text-gray-700 text-[10px]">숨김</span>}
                <span className="ml-auto opacity-50">{new Date(r.created_at).toLocaleDateString("ko-KR")}</span>
              </div>
              {r.body && <p className="text-sm whitespace-pre-line opacity-90">{r.body}</p>}
              {r.photo_urls.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {r.photo_urls.map((u) => (
                    <div key={u} className="relative w-12 h-12 rounded overflow-hidden border border-[var(--border)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
              <ReviewAdminActions reviewId={r.id} listingId={listingId} visible={r.is_visible} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
