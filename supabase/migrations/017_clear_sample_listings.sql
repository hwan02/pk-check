-- 데모 카드 자동생성 listings 제거
-- /api/listings/ensure (삭제됨) 가 cards_with_prices 카드를 클릭할 때마다
-- listings 에 card_id 채운 행을 자동 insert 했었음. 실제 상품 등록 전에 정리.
-- 실제 등록 상품은 card_id IS NULL 로 들어가므로 영향 없음.

DELETE FROM order_items
  WHERE listing_id IN (SELECT id FROM listings WHERE card_id IS NOT NULL);

DELETE FROM cart_items
  WHERE listing_id IN (SELECT id FROM listings WHERE card_id IS NOT NULL);

DELETE FROM listings
  WHERE card_id IS NOT NULL;
