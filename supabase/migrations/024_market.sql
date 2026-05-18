-- ===========================================================
-- 020_market: 시세 페이지용 카드 (수동 관리)
-- ===========================================================

CREATE TABLE IF NOT EXISTS market_cards (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category        text NOT NULL CHECK (category IN ('pokemon', 'onepiece')),
  name            text NOT NULL,                   -- 한글 이름
  name_en         text,                            -- 영어/일어 이름 (선택)
  set_name        text,                            -- 세트명 (예: 메가 진화 / SV3)
  rarity          text,                            -- 등급 (예: SAR, AR, R)
  image_url       text,
  price_krw       integer NOT NULL CHECK (price_krw >= 0),
  prev_price_krw  integer CHECK (prev_price_krw >= 0),  -- 직전가 (변동률 자동 계산)
  notes           text,                            -- 메모
  is_active       boolean NOT NULL DEFAULT true,
  display_order   integer NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_cards_category
  ON market_cards (category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_market_cards_order
  ON market_cards (display_order, created_at DESC);

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION public.touch_market_cards_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS market_cards_updated_at ON market_cards;
CREATE TRIGGER market_cards_updated_at
  BEFORE UPDATE ON market_cards
  FOR EACH ROW EXECUTE FUNCTION public.touch_market_cards_updated_at();

-- price_krw 가 바뀌면 직전 값을 prev_price_krw 에 자동 보관
CREATE OR REPLACE FUNCTION public.touch_market_prev_price()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.price_krw IS DISTINCT FROM OLD.price_krw THEN
    NEW.prev_price_krw = OLD.price_krw;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS market_cards_prev_price ON market_cards;
CREATE TRIGGER market_cards_prev_price
  BEFORE UPDATE OF price_krw ON market_cards
  FOR EACH ROW EXECUTE FUNCTION public.touch_market_prev_price();

-- RLS: anon/authenticated 는 활성 카드 SELECT 만. 쓰기는 service-role 에서만.
ALTER TABLE market_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "market_cards_public_select" ON market_cards;
CREATE POLICY "market_cards_public_select" ON market_cards
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);
