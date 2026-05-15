-- 묶음 배송 그룹
ALTER TABLE orders ADD COLUMN IF NOT EXISTS bundle_group text;
-- 같은 bundle_group 값을 가진 주문들은 한 박스로 발송
-- 예: bundle_group = 'BDL-20260515-abc123'
