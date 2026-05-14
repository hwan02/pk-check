-- 매거진/콘텐츠 (KREAM /content 류)
CREATE TABLE articles (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug          text UNIQUE NOT NULL,
  title         text NOT NULL,
  subtitle      text,
  cover_image   text,
  body_md       text NOT NULL,
  published_at  date NOT NULL DEFAULT CURRENT_DATE,
  is_published  boolean NOT NULL DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_articles_published ON articles (is_published, published_at DESC);
