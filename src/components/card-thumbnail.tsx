import Image from "next/image";
import Link from "next/link";
import type { CardWithPrice } from "@/lib/types";

export default function CardThumbnail({ card }: { card: CardWithPrice }) {
  const tcgPrice = card.prices?.tcg_market;
  const snkrPrice = card.prices?.snkrdunk_price;

  return (
    <Link
      href={`/card/${card.id}`}
      className="group block rounded-lg border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden card-glow transition relative holo-shimmer"
    >
      <div className="aspect-[2.5/3.5] relative bg-gray-100">
        {card.region && card.region !== "en" && (
          <span className={`absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${
            card.region === "jp" ? "bg-red-500" : "bg-blue-500"
          }`}>
            {card.region === "jp" ? "JP" : card.region === "kr" ? "KR" : card.region.toUpperCase()}
          </span>
        )}
        {card.image_small ? (
          <Image
            src={card.image_small}
            alt={card.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-contain group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-xs opacity-30">
            No Image
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-sm font-medium truncate">{card.name}</p>
        {card.name_ja && (
          <p className="text-xs opacity-60 truncate">{card.name_ja}</p>
        )}
        <p className="text-xs opacity-50 mt-0.5">{(card.region === "kr" ? card.rarity_ja : null) ?? card.rarity ?? ""}</p>
        <div className="flex gap-3 mt-1.5 text-xs">
          {tcgPrice != null && (
            <span className="text-green-600 font-medium">
              ${tcgPrice.toFixed(2)}
            </span>
          )}
          {snkrPrice != null && (
            <span className="text-blue-600 font-medium">
              ¥{snkrPrice.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
