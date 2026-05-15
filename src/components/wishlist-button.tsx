"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  listingId: string;
  initialWishlisted: boolean;
  loggedIn: boolean;
  variant?: "icon" | "full";
  className?: string;
}

export default function WishlistButton({
  listingId,
  initialWishlisted,
  loggedIn,
  variant = "icon",
  className = "",
}: Props) {
  const router = useRouter();
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [pending, startTransition] = useTransition();

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!loggedIn) {
      router.push(`/login?redirect=/shop/${listingId}`);
      return;
    }
    const next = !wishlisted;
    setWishlisted(next);
    startTransition(async () => {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listing_id: listingId }),
      });
      if (!res.ok) {
        setWishlisted(!next);
        return;
      }
      const json = (await res.json()) as { wishlisted: boolean };
      setWishlisted(json.wishlisted);
      router.refresh();
    });
  }

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={wishlisted}
        className={`w-full py-3 rounded-xl border font-medium disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 ${
          wishlisted
            ? "border-rose-300 bg-rose-50 text-rose-600"
            : "border-[var(--border)] hover:bg-[var(--surface)]"
        } ${className}`}
      >
        <HeartIcon filled={wishlisted} />
        {wishlisted ? "찜 해제" : "찜하기"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label={wishlisted ? "찜 해제" : "찜하기"}
      aria-pressed={wishlisted}
      className={`flex items-center justify-center rounded-full bg-white/90 backdrop-blur border border-[var(--border)] hover:bg-white shadow-sm disabled:opacity-50 cursor-pointer transition ${className}`}
    >
      <HeartIcon filled={wishlisted} />
    </button>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? "#e11d48" : "none"}
      stroke={filled ? "#e11d48" : "currentColor"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
