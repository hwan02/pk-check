-- ===========================================================
-- 028_reviews: 상품 후기 (별점 + 텍스트 + 사진)
-- ===========================================================
-- 누구나(로그인 유저) 작성. 해당 상품을 실제 주문한 user 만 is_verified=true.
-- 시드 후기는 service-role 만 insert (is_seed=true, user_id=null 허용).
-- 자동 공개 (is_visible=true). 어드민은 어떤 후기든 hide/delete 가능.

CREATE TABLE IF NOT EXISTS listing_reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rating          smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body            text NOT NULL DEFAULT '',
  photo_urls      text[] NOT NULL DEFAULT '{}',
  is_verified     boolean NOT NULL DEFAULT false,   -- 구매 인증 배지
  is_seed         boolean NOT NULL DEFAULT false,   -- 어드민 시드 후기
  author_label    text,                              -- 시드용 임의 표시명 (예: "김O진")
  is_visible      boolean NOT NULL DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_reviews_listing
  ON listing_reviews (listing_id, is_visible, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listing_reviews_user
  ON listing_reviews (user_id) WHERE user_id IS NOT NULL;

-- 한 user 가 한 listing 에 후기 1개만 (시드 제외)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_listing_reviews_user_per_listing
  ON listing_reviews (listing_id, user_id) WHERE user_id IS NOT NULL AND is_seed = false;

-- updated_at 트리거
CREATE OR REPLACE FUNCTION public.touch_listing_reviews_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS listing_reviews_updated_at ON listing_reviews;
CREATE TRIGGER listing_reviews_updated_at
  BEFORE UPDATE ON listing_reviews
  FOR EACH ROW EXECUTE FUNCTION public.touch_listing_reviews_updated_at();

-- 통계 뷰 (avg + count)
CREATE OR REPLACE VIEW listing_review_stats AS
  SELECT listing_id,
         COUNT(*)::int                       AS review_count,
         ROUND(AVG(rating)::numeric, 2)      AS avg_rating
    FROM listing_reviews
   WHERE is_visible = true
   GROUP BY listing_id;

GRANT SELECT ON listing_review_stats TO anon, authenticated;

-- ----- RLS -----
ALTER TABLE listing_reviews ENABLE ROW LEVEL SECURITY;

-- 공개: is_visible 인 후기만 anon/authenticated SELECT
DROP POLICY IF EXISTS "listing_reviews_public_select" ON listing_reviews;
CREATE POLICY "listing_reviews_public_select" ON listing_reviews
  FOR SELECT
  TO anon, authenticated
  USING (is_visible = true);

-- 본인 행은 본인이 항상 SELECT 가능 (숨김 처리된 자기 후기 조회)
DROP POLICY IF EXISTS "listing_reviews_select_own" ON listing_reviews;
CREATE POLICY "listing_reviews_select_own" ON listing_reviews
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 로그인 유저 INSERT (자기 행, 시드 아님)
DROP POLICY IF EXISTS "listing_reviews_insert_self" ON listing_reviews;
CREATE POLICY "listing_reviews_insert_self" ON listing_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND is_seed = false
  );

-- 본인 UPDATE (rating/body/photo 만 의미있게 변경 가능, 정책으론 본인만 허용)
DROP POLICY IF EXISTS "listing_reviews_update_own" ON listing_reviews;
CREATE POLICY "listing_reviews_update_own" ON listing_reviews
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 본인 DELETE
DROP POLICY IF EXISTS "listing_reviews_delete_own" ON listing_reviews;
CREATE POLICY "listing_reviews_delete_own" ON listing_reviews
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
