-- ===========================================================
-- 029_market_short_id: 시세 카드 짧은 ID (간편 링크)
-- listings 의 018 패턴과 동일
-- ===========================================================

ALTER TABLE market_cards
  ADD COLUMN IF NOT EXISTS short_id text;

-- 기존 행 백필: 8자 base36 랜덤
UPDATE market_cards
SET short_id = lpad(
  to_hex((random() * 4294967295)::bigint),
  8,
  '0'
)
WHERE short_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_market_cards_short_id
  ON market_cards (short_id);
