-- 한국판 카드 레어리티 정규화
-- 기존 region='kr' 카드들은 rarity 컬럼에 한국 약자(C, U, R, RR, AR, SR, SAR, UR 등)가 저장되어 있어서
-- 영문 풀네임을 기준으로 동작하는 필터(eq("rarity", "Double Rare"))와 매칭되지 않음.
-- rarity 컬럼은 영문 정규 명칭으로, rarity_ja 컬럼은 한국 약자로 정리.

UPDATE cards
SET
  rarity_ja = COALESCE(rarity_ja, rarity),
  rarity = CASE rarity
    WHEN 'C'   THEN 'Common'
    WHEN 'U'   THEN 'Uncommon'
    WHEN 'R'   THEN 'Rare'
    WHEN 'RR'  THEN 'Double Rare'
    WHEN 'RRR' THEN 'Double Rare'
    WHEN 'AR'  THEN 'Illustration Rare'
    WHEN 'SR'  THEN 'Secret Rare'
    WHEN 'SAR' THEN 'Special Illustration Rare'
    WHEN 'UR'  THEN 'Ultra Rare'
    WHEN 'HR'  THEN 'Hyper Rare'
    WHEN 'ACE' THEN 'ACE SPEC Rare'
    WHEN 'P'   THEN 'Promo'
    WHEN 'PR'  THEN 'Promo'
    WHEN 'CHR' THEN 'Trainer Gallery Rare Holo'
    WHEN 'TR'  THEN 'Trainer Gallery Rare Holo'
    WHEN 'S'   THEN 'Shiny Rare'
    ELSE rarity
  END
WHERE region = 'kr';
