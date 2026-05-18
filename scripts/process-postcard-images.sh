#!/bin/bash
set -e

SRC_DIR="/Users/ssh/workspace/pk-check/supabase/image"
OUT_DIR="$SRC_DIR/processed/postcards"
mkdir -p "$OUT_DIR"

# 시범 결과 청소
rm -f "$SRC_DIR/processed/0"*.png 2>/dev/null || true

i=1
for src in "$SRC_DIR"/KakaoTalk_Photo_*.jpeg; do
  num=$(printf "%02d" $i)
  echo "[$num] $(basename "$src")"
  tmp_trim="$OUT_DIR/${num}-trim.png"
  tmp_rmbg="$OUT_DIR/${num}-rmbg.png"
  final="$OUT_DIR/${num}.png"
  magick "$src" -fuzz 5% -trim +repage "$tmp_trim"
  rembg i "$tmp_trim" "$tmp_rmbg" 2>/dev/null
  magick "$tmp_rmbg" -background white -alpha remove -alpha off "$final"
  rm -f "$tmp_trim" "$tmp_rmbg"
  i=$((i+1))
done

echo
echo "완료. 결과 디렉토리: $OUT_DIR"
ls "$OUT_DIR"
