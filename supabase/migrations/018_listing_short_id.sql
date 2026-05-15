-- ===========================================================
-- 018_listing_short_id: 짧은 상품 ID (간편 링크)
--   - 8자 영숫자, nanoid 라이브러리로 생성
--   - 기존 행은 SQL 로 일괄 백필 (랜덤 base36)
--   - 라우트는 short_id / UUID 둘 다 받음
-- ===========================================================

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS short_id text;

-- 기존 행 백필: 8자 base36 랜덤
UPDATE listings
SET short_id = lpad(
  to_hex((random() * 4294967295)::bigint),
  8,
  '0'
)
WHERE short_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_short_id ON listings (short_id);
