import Image from "next/image";
import Link from "next/link";
import { CATEGORY_LABEL, LANGUAGE_LABEL, formatUSD, type Listing } from "@/lib/shop";

export default function ShopGrid({ listings }: { listings: Listing[] }) {
  if (listings.length === 0) {
    return (
      <div className="py-20 text-center text-sm opacity-50">
        등록된 상품이 없습니다.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-3 gap-y-7">
      {listings.map((l) => {
        const primary = l.title_en || l.title;
        const secondary = l.title_en && l.title !== l.title_en ? l.title : null;
        const meta = [CATEGORY_LABEL[l.category], l.language && LANGUAGE_LABEL[l.language]].filter(Boolean).join(" · ");
        return (
          <Link key={l.id} href={`/shop/${l.id}`} className="block group">
            <div className="rounded-xl overflow-hidden bg-[var(--surface)] border border-[var(--border)] group-hover:border-[var(--border-strong)] transition-colors">
              <div className="aspect-square relative bg-white">
                {l.image_url ? (
                  <Image
                    src={l.image_url}
                    alt={l.title}
                    fill
                    className="object-contain p-4 group-hover:scale-[1.03] transition-transform duration-200"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs opacity-40">
                    no image
                  </div>
                )}
              </div>
            </div>

            <div className="mt-2.5 px-0.5">
              {/* 영문 메타 (KREAM 스타일 작은 라벨) */}
              {meta && (
                <p className="text-[10px] tracking-widest uppercase opacity-50 truncate">
                  {meta}
                </p>
              )}
              {/* primary - 영문 우선 */}
              <p className="text-[13px] font-bold leading-snug line-clamp-1 mt-0.5">
                {primary}
              </p>
              {/* secondary - 한글 부제 */}
              {secondary && (
                <p className="text-[11px] opacity-50 line-clamp-1 mt-0.5">
                  {secondary}
                </p>
              )}
              {/* 가격 */}
              <p className="text-[15px] font-extrabold mt-1.5 tracking-tight">
                {formatUSD(l.price_usd)}
              </p>
              <p className="text-[10px] opacity-50 mt-0.5">즉시 구매가</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
