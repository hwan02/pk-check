-- ===========================================================
-- 021_wishlists: 찜하기 (관심 상품)
-- ===========================================================

CREATE TABLE IF NOT EXISTS wishlists (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id  uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlists_user
  ON wishlists (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wishlists_listing
  ON wishlists (listing_id);

-- ----- RLS -----
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wishlists_select_own" ON wishlists;
CREATE POLICY "wishlists_select_own" ON wishlists
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "wishlists_insert_own" ON wishlists;
CREATE POLICY "wishlists_insert_own" ON wishlists
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "wishlists_delete_own" ON wishlists;
CREATE POLICY "wishlists_delete_own" ON wishlists
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
