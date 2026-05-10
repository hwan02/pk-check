ALTER TABLE sets ADD COLUMN IF NOT EXISTS region text DEFAULT 'en';
UPDATE sets SET region = 'kr' WHERE id = 'kr-cards';
UPDATE sets SET region = 'kr' WHERE series = 'Korean';
UPDATE sets SET region = 'jp' WHERE id = 'custom';
