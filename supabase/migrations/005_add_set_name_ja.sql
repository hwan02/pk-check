ALTER TABLE sets ADD COLUMN IF NOT EXISTS name_ja text;

-- 주요 최신 세트 일본어 이름 매핑
UPDATE sets SET name_ja = 'メガシンカ' WHERE id = 'me1';
UPDATE sets SET name_ja = 'ファントムフレイム' WHERE id = 'me2';
UPDATE sets SET name_ja = 'MEGAドリームex' WHERE id = 'me2pt5';
UPDATE sets SET name_ja = 'パーフェクトオーダー' WHERE id = 'me3';
UPDATE sets SET name_ja = 'ホワイトフレア' WHERE id = 'rsv10pt5';
UPDATE sets SET name_ja = 'ブラックボルト' WHERE id = 'zsv10pt5';
UPDATE sets SET name_ja = '運命のふたり' WHERE id = 'sv10';
UPDATE sets SET name_ja = 'いっしょにあるこう' WHERE id = 'sv9';
UPDATE sets SET name_ja = 'プリズマティックエボリューション' WHERE id = 'sv8pt5';
UPDATE sets SET name_ja = 'スーパーエレクトリックブレイカー' WHERE id = 'sv8';
UPDATE sets SET name_ja = 'テラスタルフェスex' WHERE id = 'sv8pt5';
UPDATE sets SET name_ja = 'ステラクラウン' WHERE id = 'sv7';
UPDATE sets SET name_ja = 'ナイトワンダラー' WHERE id = 'sv6pt5';
UPDATE sets SET name_ja = 'へんげんのヴェール' WHERE id = 'sv6';
UPDATE sets SET name_ja = 'テンポラルフォース' WHERE id = 'sv5';
UPDATE sets SET name_ja = 'パルデアの光' WHERE id = 'sv4pt5';
UPDATE sets SET name_ja = 'パラドックスリフト' WHERE id = 'sv4';
UPDATE sets SET name_ja = 'ポケモンカード151' WHERE id = 'sv3pt5';
UPDATE sets SET name_ja = '黒炎の支配者' WHERE id = 'sv3';
UPDATE sets SET name_ja = 'パルデアの進化' WHERE id = 'sv2';
