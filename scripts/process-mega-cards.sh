#!/bin/bash
set -e

SRC_DIR="/Users/ssh/workspace/pk-check/supabase/image/random"
OUT_DIR="/Users/ssh/workspace/pk-check/supabase/image/processed/mega-deck"
mkdir -p "$OUT_DIR"

i=1
for src in "$SRC_DIR"/KakaoTalk_Photo_*.jpeg; do
  num=$(printf "%02d" $i)
  echo "[$num] $(basename "$src")"
  tmp_rmbg="$OUT_DIR/${num}-rmbg.png"
  final="$OUT_DIR/${num}.png"
  rembg i "$src" "$tmp_rmbg" 2>/dev/null
  magick "$tmp_rmbg" -background white -alpha remove -alpha off "$final"
  rm -f "$tmp_rmbg"
  i=$((i+1))
done

echo
echo "완료: $OUT_DIR"
ls "$OUT_DIR"
