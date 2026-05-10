-- cards + prices join 뷰 (가격 정렬용)
CREATE OR REPLACE VIEW cards_with_prices AS
SELECT
  c.*,
  p.tcg_market,
  p.tcg_low,
  p.tcg_mid,
  p.tcg_high,
  p.snkrdunk_price,
  p.snkrdunk_title,
  p.fetched_at AS price_fetched_at,
  s.name AS set_name,
  s.series AS set_series,
  s.logo_url AS set_logo_url,
  s.symbol_url AS set_symbol_url,
  s.snkrdunk_box_price AS set_box_price,
  s.snkrdunk_box_title AS set_box_title
FROM cards c
LEFT JOIN prices p ON p.card_id = c.id
LEFT JOIN sets s ON s.id = c.set_id;
