-- ===========================================================
-- 029_market_region: market_cards 에 지역(에디션) 컬럼
-- ===========================================================
-- jp: 일본판 · kr: 한국판 · en: 북미판
-- /hit 페이지의 국기 토글에서 사용

ALTER TABLE market_cards
  ADD COLUMN IF NOT EXISTS region text CHECK (region IN ('jp', 'kr', 'en'));

CREATE INDEX IF NOT EXISTS idx_market_cards_region
  ON market_cards (region) WHERE region IS NOT NULL;

-- 백필 — notes 키로 region 판정
-- · cat:kr-... → 한국판 (kr)
-- · cat:op-... → 일본 공식에서 가져온 원피스 → 일본판 (jp)
UPDATE market_cards
  SET region = 'kr'
  WHERE region IS NULL
    AND notes LIKE 'cat:kr-%';

UPDATE market_cards
  SET region = 'jp'
  WHERE region IS NULL
    AND notes LIKE 'cat:op-%';

-- 포켓몬 박스/팩(어드민 수동 입력, notes 없음) 도 현재 데이터는 전부 한국판
UPDATE market_cards
  SET region = 'kr'
  WHERE region IS NULL
    AND category = 'pokemon';
