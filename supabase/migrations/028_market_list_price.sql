-- ===========================================================
-- 028_market_list_price: market_cards 에 정가 (제조사/출시 정가) 컬럼
-- ===========================================================
-- - list_price_krw: 출시 정가 (원). 실시세와 비교용. nullable.

ALTER TABLE market_cards
  ADD COLUMN IF NOT EXISTS list_price_krw integer
    CHECK (list_price_krw IS NULL OR list_price_krw >= 0);
