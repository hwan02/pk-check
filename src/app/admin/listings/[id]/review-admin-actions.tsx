"use client";

import { useTransition } from "react";
import { deleteAnyReview, toggleReviewVisibility } from "./admin-review-actions";

interface Props {
  reviewId: string;
  listingId: string;
  visible: boolean;
}

export default function ReviewAdminActions({ reviewId, listingId, visible }: Props) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-2 mt-2 text-xs">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => { await toggleReviewVisibility(reviewId, listingId, !visible); })}
        className="opacity-60 hover:opacity-100"
      >
        {visible ? "숨기기" : "다시 보이기"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("이 후기를 영구 삭제할까요?")) return;
          start(async () => { await deleteAnyReview(reviewId, listingId); });
        }}
        className="opacity-60 hover:opacity-100 hover:text-red-600 ml-auto"
      >
        삭제
      </button>
    </div>
  );
}
