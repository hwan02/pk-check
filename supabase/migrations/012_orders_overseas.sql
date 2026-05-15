-- ===========================================================
-- 012_orders_overseas: 해외 구매자용 주문/배송조회 컬럼 추가
--   - 통관, 배송 추적, 대행수수료, 결제수수료,
--     계산환율, 예상중량, 결제수단(신용카드) 등
-- ===========================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_no           text UNIQUE,
  ADD COLUMN IF NOT EXISTS agent_fee_usd      numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_fee_usd    numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS exchange_rate      numeric(12,4),         -- 1 USD = N KRW
  ADD COLUMN IF NOT EXISTS estimated_weight_g integer,                -- 예상 중량 (g)
  ADD COLUMN IF NOT EXISTS payment_method     text DEFAULT 'card'
    CHECK (payment_method IN ('card', 'paypal', 'bank')),
  ADD COLUMN IF NOT EXISTS card_brand         text,                   -- VISA / Master / AMEX
  ADD COLUMN IF NOT EXISTS card_last4         text,
  -- 배송 추적
  ADD COLUMN IF NOT EXISTS tracking_carrier   text,                   -- DHL / EMS / FedEx 등
  ADD COLUMN IF NOT EXISTS tracking_no        text,
  ADD COLUMN IF NOT EXISTS tracking_url       text,
  ADD COLUMN IF NOT EXISTS shipped_at         timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at       timestamptz,
  -- 통관
  ADD COLUMN IF NOT EXISTS customs_status     text DEFAULT 'pending'
    CHECK (customs_status IN ('pending', 'in_review', 'cleared', 'held')),
  ADD COLUMN IF NOT EXISTS customs_cleared_at timestamptz;

-- 주문번호 자동 생성 (PK-yyyymmdd-XXXXXX)
CREATE OR REPLACE FUNCTION public.set_order_no()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.order_no IS NULL THEN
    NEW.order_no := 'PK-' ||
      to_char(coalesce(NEW.created_at, now()), 'YYYYMMDD') || '-' ||
      upper(substr(replace(NEW.id::text, '-', ''), 1, 6));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_set_order_no ON orders;
CREATE TRIGGER trg_set_order_no
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION public.set_order_no();

CREATE INDEX IF NOT EXISTS idx_orders_order_no ON orders (order_no);
CREATE INDEX IF NOT EXISTS idx_orders_tracking ON orders (tracking_no);
