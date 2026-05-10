import type { CardWithPrice } from "@/lib/types";
import CardThumbnail from "./card-thumbnail";

export default function CardGrid({ cards }: { cards: CardWithPrice[] }) {
  if (!cards.length) {
    return (
      <div className="text-center py-20 opacity-50">
        검색 결과가 없습니다.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {cards.map((card) => (
        <CardThumbnail key={card.id} card={card} />
      ))}
    </div>
  );
}
