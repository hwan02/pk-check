-- ===========================================================
-- 033_drop_stock_autoinactivate
--   migration 031 의 stock=0 자동 비활성화 trigger 제거.
--   정책 변경: stock=0 + is_active=true 도 노출 가능하게 (Sold Out 표시 위해).
-- ===========================================================

DROP TRIGGER IF EXISTS trg_listings_autoinactivate ON listings;
DROP FUNCTION IF EXISTS public.listings_autoinactivate_on_zero_stock();
