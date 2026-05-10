-- 카드 지역/에디션 구분
ALTER TABLE cards ADD COLUMN IF NOT EXISTS region text DEFAULT 'en';

-- 기존 카드는 북미판(en), snkrdunk에서 추가한건 일본판(jp)
UPDATE cards SET region = 'jp' WHERE id LIKE 'snkr-%';

CREATE INDEX IF NOT EXISTS idx_cards_region ON cards (region);
