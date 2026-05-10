"use client";

import Link from "next/link";

interface Props {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
}

export default function Pagination({ currentPage, totalPages, baseUrl }: Props) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 2) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  const separator = baseUrl.includes("?") ? "&" : "?";

  return (
    <div className="flex justify-center gap-1 mt-8">
      {pages.map((p, idx) =>
        p === "..." ? (
          <span key={`ellipsis-${idx}`} className="px-3 py-2 text-sm opacity-50">
            ...
          </span>
        ) : (
          <Link
            key={p}
            href={`${baseUrl}${separator}page=${p}`}
            className={`px-3 py-2 rounded text-sm transition ${
              p === currentPage
                ? "bg-[var(--primary)] text-white"
                : "border border-[var(--border)] hover:bg-[var(--border)]"
            }`}
          >
            {p}
          </Link>
        )
      )}
    </div>
  );
}
