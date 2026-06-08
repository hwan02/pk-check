-- ===========================================================
-- 032_raffles: 일본 아마존 응모(抽選販売) 정보 어그리게이터
-- ===========================================================

CREATE TABLE IF NOT EXISTS raffles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category        text NOT NULL CHECK (category IN ('pokemon', 'onepiece', 'other')),
  title           text NOT NULL,                    -- 한글 타이틀
  title_ja        text,                             -- 일본어 원제 (선택)
  image_url       text,                             -- 박스/상품 이미지 (Amazon 직링크 OK)
  apply_start_at  timestamptz,                      -- 응모 시작 (JST 기준 입력)
  apply_end_at    timestamptz,                      -- 응모 마감
  draw_at         timestamptz,                      -- 추첨일
  ship_note       text,                             -- 발송 예정 안내 (자유 텍스트, 예: "2026년 7월 중순")
  amazon_url      text NOT NULL,                    -- 아마존 JP 응모 페이지 URL
  price_jpy       integer CHECK (price_jpy >= 0),   -- 정가(엔)
  notes           text,                             -- 비고/조건
  is_active       boolean NOT NULL DEFAULT true,
  display_order   integer NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_raffles_active
  ON raffles (is_active, apply_end_at DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_raffles_category
  ON raffles (category, apply_end_at DESC) WHERE is_active = true;

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION public.touch_raffles_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS raffles_updated_at ON raffles;
CREATE TRIGGER raffles_updated_at
  BEFORE UPDATE ON raffles
  FOR EACH ROW EXECUTE FUNCTION public.touch_raffles_updated_at();

-- RLS: anon/authenticated 활성 행만 SELECT. 쓰기는 service-role 에서.
ALTER TABLE raffles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "raffles_public_select" ON raffles;
CREATE POLICY "raffles_public_select" ON raffles
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);
