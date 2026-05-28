-- ===========================================================
-- 030_order_hardening: 결제/주문 안정성 강화
--   1) payment_events  — PayPal 응답/webhook 원본 기록 (분쟁 증거)
--   2) atomic_stock RPC — listings.stock 동시성 안전 차감/복구
--   3) pending 만료 인덱스 — cron 으로 오래된 pending 정리
--   4) orders.cancel_reason / admin_memo 컬럼 (간단한 운영 메모)
-- ===========================================================

-- ----- payment_events -----
CREATE TABLE IF NOT EXISTS payment_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid REFERENCES orders(id) ON DELETE CASCADE,
  event_type      text NOT NULL,
  -- order_created / order_captured / order_capture_failed
  -- webhook.payment.capture.completed / .refunded / .denied
  -- webhook.customer.dispute.created / .resolved
  -- admin_refund / admin_status_change
  paypal_event_id text,                       -- webhook event id (멱등)
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  source          text NOT NULL DEFAULT 'server'
                  CHECK (source IN ('server', 'webhook', 'admin', 'cron')),
  created_at      timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_events_paypal_event
  ON payment_events (paypal_event_id) WHERE paypal_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_events_order ON payment_events (order_id, created_at DESC);

-- 어드민만 직접 읽기
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payment_events_admin_read ON payment_events;
CREATE POLICY payment_events_admin_read ON payment_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
-- 쓰기는 service-role 만 (RLS 없음 → bypass)

-- ----- atomic 재고 감소: 부족하면 false 리턴 -----
-- 한 트랜잭션 안에서 모든 아이템을 감소시킴. 어느 하나라도 부족하면 전부 롤백 후 false.
CREATE OR REPLACE FUNCTION public.decrement_stock(items jsonb)
RETURNS TABLE(ok boolean, fail_listing_id uuid, fail_stock integer, fail_need integer)
LANGUAGE plpgsql AS $$
DECLARE
  it jsonb;
  lid uuid;
  need integer;
  cur_stock integer;
BEGIN
  FOR it IN SELECT * FROM jsonb_array_elements(items) LOOP
    lid := (it->>'listing_id')::uuid;
    need := (it->>'quantity')::integer;
    IF lid IS NULL OR need IS NULL OR need <= 0 THEN
      CONTINUE;
    END IF;

    -- FOR UPDATE 으로 row lock
    SELECT stock INTO cur_stock FROM listings WHERE id = lid FOR UPDATE;
    IF NOT FOUND THEN
      -- listing 이 삭제된 케이스는 skip (order_items.listing_id SET NULL 정책)
      CONTINUE;
    END IF;
    IF cur_stock < need THEN
      -- 부족 — 트랜잭션 abort (호출측이 SAVEPOINT 안 쓰면 전체 롤백)
      ok := false;
      fail_listing_id := lid;
      fail_stock := cur_stock;
      fail_need := need;
      RETURN NEXT;
      RETURN;
    END IF;
    UPDATE listings SET stock = stock - need, updated_at = now() WHERE id = lid;
  END LOOP;

  ok := true;
  RETURN NEXT;
END; $$;

-- ----- 재고 복구 (취소/환불 시) -----
CREATE OR REPLACE FUNCTION public.restore_stock(items jsonb)
RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  it jsonb;
  lid uuid;
  need integer;
BEGIN
  FOR it IN SELECT * FROM jsonb_array_elements(items) LOOP
    lid := (it->>'listing_id')::uuid;
    need := (it->>'quantity')::integer;
    IF lid IS NULL OR need IS NULL OR need <= 0 THEN
      CONTINUE;
    END IF;
    UPDATE listings SET stock = stock + need, updated_at = now() WHERE id = lid;
  END LOOP;
END; $$;

-- ----- pending 만료 cron 용 인덱스 -----
CREATE INDEX IF NOT EXISTS idx_orders_pending_age
  ON orders (created_at)
  WHERE status = 'pending';

-- ----- orders 운영 컬럼 -----
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS admin_memo     text,
  ADD COLUMN IF NOT EXISTS cancel_reason  text,
  ADD COLUMN IF NOT EXISTS cancelled_at   timestamptz,
  ADD COLUMN IF NOT EXISTS refunded_at    timestamptz;
