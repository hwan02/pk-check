"use client";

import { useTransition } from "react";
import { deleteOwnReview } from "./review-actions";

interface Props {
  reviewId: string;
  listingSlug: string;
}

export default function ReviewDeleteButton({ reviewId, listingSlug }: Props) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => {
        if (!confirm("내 후기를 삭제할까요?")) return;
        start(async () => {
          await deleteOwnReview(reviewId, listingSlug);
        });
      }}
      disabled={pending}
      className="text-[10px] opacity-50 hover:opacity-100 hover:text-red-600 ml-1"
    >
      삭제
    </button>
  );
}
