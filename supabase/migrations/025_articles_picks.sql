-- ===========================================================
-- 021_articles_picks: articles RLS + 매거진 글에 시세 픽 카드 연결
-- ===========================================================

-- 1) articles RLS — 공개 글만 anon/authenticated SELECT 허용
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "articles_public_select" ON articles;
CREATE POLICY "articles_public_select" ON articles
  FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

-- 2) article ↔ market_cards 다대다 (이번 주 픽 카드)
CREATE TABLE IF NOT EXISTS article_market_picks (
  article_id      bigint NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  market_card_id  uuid   NOT NULL REFERENCES market_cards(id) ON DELETE CASCADE,
  display_order   integer NOT NULL DEFAULT 0,
  PRIMARY KEY (article_id, market_card_id)
);

CREATE INDEX IF NOT EXISTS idx_article_picks_article
  ON article_market_picks (article_id, display_order);

-- RLS: 공개 article 의 픽만 anon SELECT
ALTER TABLE article_market_picks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "article_picks_public_select" ON article_market_picks;
CREATE POLICY "article_picks_public_select" ON article_market_picks
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM articles a
      WHERE a.id = article_market_picks.article_id
        AND a.is_published = true
    )
  );

-- updated_at 자동 갱신 트리거 (articles 에 아직 없을 가능성 있어 추가)
CREATE OR REPLACE FUNCTION public.touch_articles_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS articles_updated_at ON articles;
CREATE TRIGGER articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION public.touch_articles_updated_at();
