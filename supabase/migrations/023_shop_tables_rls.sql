-- cart_items / orders / order_items 명시적 RLS 정책.
-- 쓰기는 모두 service-role API(createServerClient) 를 거치므로 RLS 우회 → INSERT/UPDATE/DELETE 정책 없음.
-- 일반 사용자는 anon/authenticated 키로 본인 것만 SELECT 가능.
-- 어드민 페이지/API 도 service-role 사용 → 정책 영향 없음.

-- ===== cart_items =====
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cart_items_select_own" ON cart_items;
CREATE POLICY "cart_items_select_own" ON cart_items
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ===== orders =====
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_own" ON orders;
CREATE POLICY "orders_select_own" ON orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ===== order_items =====
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_select_own" ON order_items;
CREATE POLICY "order_items_select_own" ON order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND o.user_id = auth.uid()
    )
  );
