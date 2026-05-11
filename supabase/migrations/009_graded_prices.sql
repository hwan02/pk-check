-- 등급사별 카드 등급 가격 (PSA 10, BGS 9.5, CGC 10 등)
-- 수동으로 입력해 시간별 시세 추적 → 그래프

CREATE TABLE graded_prices (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  card_id      text NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  company      text NOT NULL,                       -- PSA / BGS / CGC / SGC 등
  grade        text NOT NULL,                       -- "10", "9", "9.5" 등
  price        numeric(12, 2) NOT NULL,             -- 가격 (currency 단위)
  currency     text NOT NULL DEFAULT 'KRW',         -- KRW / JPY / USD
  recorded_at  date NOT NULL DEFAULT CURRENT_DATE,  -- 사용자가 기록한 시점
  note         text,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX idx_graded_prices_card_date ON graded_prices (card_id, recorded_at DESC);
CREATE INDEX idx_graded_prices_combo ON graded_prices (card_id, company, grade, recorded_at DESC);
