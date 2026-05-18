-- listings/cart_items/orders/order_items 가 만들어질 때 명시적 RLS 정책이 없었음.
-- anon 으로 listings SELECT 가 안 되어 상품이 노출되지 않는 문제 수정.
-- listings 는 공개 카탈로그이므로 anon/authenticated 모두 SELECT 허용.
-- 쓰기는 service-role 만 가능(어드민 API 경유) → 별도 정책 불필요.

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listings_public_select" ON listings;
CREATE POLICY "listings_public_select" ON listings
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);
