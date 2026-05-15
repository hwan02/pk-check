-- ===========================================================
-- 016_listing_video: 상품 상세 영상
--   - YouTube / Vimeo 임베드 URL (용량 부담 없음, 권장)
--   - 직접 호스팅 mp4 URL 도 허용 (Supabase Storage 등)
-- ===========================================================

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS video_url text;

COMMENT ON COLUMN listings.video_url IS
  'YouTube/Vimeo URL 권장 (자동 임베드). 직접 호스팅 mp4 도 가능';
