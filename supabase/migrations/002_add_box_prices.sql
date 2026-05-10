-- 세트별 박스 시세 필드 추가
ALTER TABLE sets ADD COLUMN IF NOT EXISTS snkrdunk_box_price integer;
ALTER TABLE sets ADD COLUMN IF NOT EXISTS snkrdunk_box_title text;
