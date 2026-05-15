"use client";

import Image from "next/image";
import { useState } from "react";

export default function ProductGallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="aspect-square rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] flex items-center justify-center text-sm opacity-40">
        이미지 없음
      </div>
    );
  }

  const current = images[active] ?? images[0];

  return (
    <div>
      <div className="aspect-square relative rounded-2xl overflow-hidden bg-[var(--card-bg)] border border-[var(--border)]">
        <Image
          src={current}
          alt={title}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
      </div>

      {images.length > 1 && (
        <ul className="mt-3 grid grid-cols-5 gap-2">
          {images.map((src, i) => (
            <li key={src + i}>
              <button
                type="button"
                onClick={() => setActive(i)}
                className={`relative aspect-square w-full rounded-lg overflow-hidden bg-[var(--card-bg)] border transition ${
                  i === active
                    ? "border-[var(--primary)] ring-2 ring-[var(--primary)]"
                    : "border-[var(--border)] hover:border-[var(--border-strong)]"
                }`}
                aria-label={`이미지 ${i + 1}`}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  className="object-contain"
                  sizes="80px"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
