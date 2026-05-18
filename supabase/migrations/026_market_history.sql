-- ===========================================================
-- 026_market_history: 등급별 가격 히스토리로 전환
-- ===========================================================
-- 변경:
--  - market_cards.price_krw / prev_price_krw / 관련 트리거 제거
--  - 신규: market_price_history (card_id, grade, price_krw, recorded_at)
--  - RLS: 공개 카드의 history 만 anon SELECT 허용

-- 1) 기존 trigger 제거
DROP TRIGGER IF EXISTS market_cards_prev_price ON market_cards;
DROP FUNCTION IF EXISTS public.touch_market_prev_price();

-- 2) 컬럼 제거 (placeholder 데이터의 0원 가격도 같이 정리됨)
ALTER TABLE market_cards DROP COLUMN IF EXISTS prev_price_krw;
ALTER TABLE market_cards DROP COLUMN IF EXISTS price_krw;

-- 3) 가격 히스토리 테이블
CREATE TABLE IF NOT EXISTS market_price_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id       uuid NOT NULL REFERENCES market_cards(id) ON DELETE CASCADE,
  grade         text NOT NULL,                  -- 'PSA 10', 'PSA 9', 'raw', 'BGS 10' 등 자유 입력
  price_krw     integer NOT NULL CHECK (price_krw >= 0),
  recorded_at   date NOT NULL DEFAULT CURRENT_DATE,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_history_card_date
  ON market_price_history (card_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_history_card_grade_date
  ON market_price_history (card_id, grade, recorded_at DESC);

-- 4) RLS
ALTER TABLE market_price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "market_history_public_select" ON market_price_history;
CREATE POLICY "market_history_public_select" ON market_price_history
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM market_cards mc
      WHERE mc.id = market_price_history.card_id
        AND mc.is_active = true
    )
  );
