-- ===========================================================
-- 019_drop_agent_fee: 대행수수료 컬럼 제거
--   Kikidult 는 직판(reseller) 모델 — 대행수수료 받지 않음
-- ===========================================================

ALTER TABLE orders DROP COLUMN IF EXISTS agent_fee_usd;
