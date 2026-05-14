-- ===========================================================
-- 010_shop: 해외 직판 쇼핑몰 (포켓몬/원피스 카드)
-- ===========================================================

-- ----- profiles (auth.users 1:1) -----
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text,
  name        text,
  role        text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at  timestamptz DEFAULT now()
);

-- 회원가입 시 자동으로 profiles 행 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----- listings (판매 상품) -----
CREATE TABLE IF NOT EXISTS listings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,                    -- 한글 제목
  title_en      text,                             -- 영문 제목 (해외 구매자용)
  category      text NOT NULL CHECK (category IN ('pokemon', 'onepiece')),
  language      text,                             -- jp, en, kr
  condition     text,                             -- mint, near-mint, excellent, good, played
  price_usd     numeric(10,2) NOT NULL,
  stock         integer NOT NULL DEFAULT 1,
  description   text,
  description_en text,
  image_url     text,
  image_urls    text[],                           -- 추가 이미지
  is_active     boolean NOT NULL DEFAULT true,
  card_id       text REFERENCES cards(id),        -- 카탈로그 카드와 연결 (선택)
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listings_category ON listings (category);
CREATE INDEX IF NOT EXISTS idx_listings_active   ON listings (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_listings_created  ON listings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_title_trgm ON listings USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_listings_title_en_trgm ON listings USING gin (title_en gin_trgm_ops);

-- ----- cart_items (장바구니 항목) -----
CREATE TABLE IF NOT EXISTS cart_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id  uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  quantity    integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items (user_id);

-- ----- orders (주문) -----
CREATE TABLE IF NOT EXISTS orders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded')),
  subtotal_usd      numeric(10,2) NOT NULL,
  shipping_usd      numeric(10,2) NOT NULL DEFAULT 0,
  total_usd         numeric(10,2) NOT NULL,
  shipping_country  text,
  shipping_address  jsonb,             -- { name, line1, line2, city, state, postal_code, country, phone }
  paypal_order_id   text UNIQUE,
  paypal_capture_id text,
  paid_at           timestamptz,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user    ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at DESC);

-- ----- order_items (주문 상세) -----
CREATE TABLE IF NOT EXISTS order_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  listing_id   uuid REFERENCES listings(id) ON DELETE SET NULL,
  title        text NOT NULL,           -- 주문 시점의 제목 스냅샷
  title_en     text,
  image_url    text,
  price_usd    numeric(10,2) NOT NULL,
  quantity     integer NOT NULL CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);