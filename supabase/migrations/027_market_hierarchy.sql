-- ===========================================================
-- 027_market_hierarchy: market_cards 에 상품 위계 (box → pack → single)
-- ===========================================================
-- - product_type: 'box' | 'pack' | 'single' (기본 single, 기존 데이터 호환)
-- - parent_id  : 자기참조. single.parent → pack, pack.parent → box, box.parent → null
--   (다른 조합은 어플리케이션 레벨에서 검증)
-- - 가격(history) 는 그대로 사용. 박스/팩은 grade='미개봉' 한 줄로 기록 추천.

ALTER TABLE market_cards
  ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'single'
    CHECK (product_type IN ('box', 'pack', 'single')),
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES market_cards(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_market_cards_parent
  ON market_cards (parent_id) WHERE parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_market_cards_type
  ON market_cards (product_type, category) WHERE is_active = true;
