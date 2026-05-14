import Image from "next/image";
import Link from "next/link";
import { CATEGORY_LABEL, formatUSD, type Listing } from "@/lib/shop";

export default function ShopGrid({ listings }: { listings: Listing[] }) {
  if (listings.length === 0) {
    return (
      <div className="py-16 text-center text-sm opacity-50">
        등록된 상품이 없습니다.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {listings.map((l) => (
        <Link
          key={l.id}
          href={`/shop/${l.id}`}
          className="card-glow rounded-xl overflow-hidden block"
        >
          <div className="aspect-square relative bg-gray-50">
            {l.image_url ? (
              <Image
                src={l.image_url}
                alt={l.title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs opacity-40">
                이미지 없음
              </div>
            )}
            <span className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 rounded bg-[var(--primary)] text-white">
              {CATEGORY_LABEL[l.category]}
            </span>
          </div>
          <div className="p-2.5">
            <p className="text-sm font-medium leading-snug line-clamp-2">{l.title}</p>
            {l.title_en && (
              <p className="text-xs opacity-50 truncate">{l.title_en}</p>
            )}
            <p className="text-sm font-bold text-[var(--primary)] mt-1">
              {formatUSD(l.price_usd)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}