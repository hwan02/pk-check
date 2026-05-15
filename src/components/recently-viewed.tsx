"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface ViewedItem {
  id: string;
  title: string;
  image_url: string | null;
  price_usd: number;
  timestamp: number;
}

const STORAGE_KEY = "kikidult_recently_viewed";
const MAX_ITEMS = 20;

export function addToRecentlyViewed(item: Omit<ViewedItem, "timestamp">) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: ViewedItem[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((v) => v.id !== item.id);
    filtered.unshift({ ...item, timestamp: Date.now() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_ITEMS)));
  } catch { /* ignore */ }
}

export default function RecentlyViewed() {
  const [items, setItems] = useState<ViewedItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  if (!items.length) return null;

  return (
    <div className="mt-8">
      <h2 className="text-sm font-semibold mb-3 opacity-70">최근 본 상품</h2>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/shop/${item.id}`}
            className="flex-shrink-0 w-24 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden hover:border-[var(--border-strong)] transition"
          >
            <div className="aspect-square relative bg-[var(--surface)]">
              {item.image_url ? (
                <Image
                  src={item.image_url}
                  alt={item.title}
                  fill
                  sizes="96px"
                  className="object-contain"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] opacity-30">
                  No Image
                </div>
              )}
            </div>
            <div className="p-1.5">
              <p className="text-[10px] line-clamp-1">{item.title}</p>
              <p className="text-[10px] font-bold mt-0.5">${item.price_usd.toFixed(2)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
