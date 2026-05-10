-- Enable trigram extension for ILIKE search on English + Japanese names
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ===== Sets =====
CREATE TABLE sets (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  series        text,
  printed_total integer,
  release_date  date,
  logo_url      text,
  symbol_url    text,
  updated_at    timestamptz DEFAULT now()
);

-- ===== Cards =====
CREATE TABLE cards (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  name_ja       text,
  supertype     text,
  types         text[],
  subtypes      text[],
  hp            text,
  rarity        text,
  rarity_ja     text,
  set_id        text REFERENCES sets(id),
  number        text,
  artist        text,
  attacks       jsonb,
  weaknesses    jsonb,
  resistances   jsonb,
  retreat_cost  text[],
  image_small   text,
  image_large   text,
  updated_at    timestamptz DEFAULT now()
);

-- ===== Prices =====
CREATE TABLE prices (
  card_id        text PRIMARY KEY REFERENCES cards(id),
  tcg_market     numeric(10,2),
  tcg_low        numeric(10,2),
  tcg_mid        numeric(10,2),
  tcg_high       numeric(10,2),
  snkrdunk_price integer,
  snkrdunk_title text,
  fetched_at     timestamptz DEFAULT now()
);

-- ===== Indexes =====
-- Trigram indexes for ILIKE search (supports English + Japanese)
CREATE INDEX idx_cards_name_trgm    ON cards USING gin (name gin_trgm_ops);
CREATE INDEX idx_cards_name_ja_trgm ON cards USING gin (name_ja gin_trgm_ops);

-- Filter indexes
CREATE INDEX idx_cards_set_id  ON cards (set_id);
CREATE INDEX idx_cards_rarity  ON cards (rarity);
CREATE INDEX idx_cards_types   ON cards USING gin (types);

-- Price lookup
CREATE INDEX idx_prices_card_id ON prices (card_id);

-- ===== Price History (daily snapshots for chart) =====
CREATE TABLE price_history (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  card_id     text REFERENCES cards(id),
  tcg_market  numeric(10,2),
  snkrdunk_price integer,
  recorded_at date NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (card_id, recorded_at)
);

CREATE INDEX idx_price_history_card_date ON price_history (card_id, recorded_at);
