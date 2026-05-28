-- ===========================================================
-- 031_order_audit: 주문 변경 audit log + 재고 0 시 listings 자동 비활성화
-- ===========================================================

-- ----- order_audit_log: 주문 변경 이력 (누가 언제 뭐 바꿨는지) -----
CREATE TABLE IF NOT EXISTS order_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  actor_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role  text,                                -- 'admin' / 'system' / 'customer'
  action      text NOT NULL,                       -- status_change / cancel / refund / tracking / memo
  before_data jsonb,
  after_data  jsonb,
  note        text,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_audit_order ON order_audit_log (order_id, created_at DESC);

ALTER TABLE order_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS order_audit_admin_read ON order_audit_log;
CREATE POLICY order_audit_admin_read ON order_audit_log
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- ----- listings.stock = 0 일 때 자동 비활성화 -----
-- 결제로 재고가 0 으로 떨어진 순간 노출 자동 OFF (운영자가 수동 보충 후 다시 켜야 함).
CREATE OR REPLACE FUNCTION public.listings_autoinactivate_on_zero_stock()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.stock = 0 AND COALESCE(OLD.stock, 0) > 0 AND NEW.is_active = true THEN
    NEW.is_active := false;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_listings_autoinactivate ON listings;
CREATE TRIGGER trg_listings_autoinactivate
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION public.listings_autoinactivate_on_zero_stock();
