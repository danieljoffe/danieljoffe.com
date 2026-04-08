#!/usr/bin/env bash
set -euo pipefail

# Generate all SEO/meta tag images from a source SVG.
# Requires: rsvg-convert (librsvg) and ImageMagick (magick).
#
# Usage: ./scripts/generate-favicons.sh <source.svg> [output-dir]
#   source.svg  — path to the source SVG icon
#   output-dir  — destination (default: apps/root/public)

SRC="${1:?Usage: $0 <source.svg> [output-dir]}"
OUT="${2:-apps/root/public}"

if [ ! -f "$SRC" ]; then
  echo "Error: source file '$SRC' not found" >&2
  exit 1
fi

for cmd in rsvg-convert magick; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: '$cmd' is required but not installed" >&2
    echo "  brew install librsvg imagemagick" >&2
    exit 1
  fi
done

mkdir -p "$OUT"
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

echo "Generating favicons from $SRC → $OUT"

# 1. Copy SVG
cp "$SRC" "$OUT/favicon.svg"
echo "  favicon.svg"

# 2. Rasterize at all required sizes
SIZES=(16 32 48 96 150 180 192 512)
for size in "${SIZES[@]}"; do
  rsvg-convert -w "$size" -h "$size" "$SRC" -o "$TMPDIR/icon-${size}.png"
done

# 3. Copy to named output files
cp "$TMPDIR/icon-16.png"  "$OUT/favicon-16x16.png"
cp "$TMPDIR/icon-32.png"  "$OUT/favicon-32x32.png"
cp "$TMPDIR/icon-48.png"  "$OUT/favicon-48x48.png"
cp "$TMPDIR/icon-96.png"  "$OUT/favicon-96x96.png"
cp "$TMPDIR/icon-150.png" "$OUT/mstile-150x150.png"
cp "$TMPDIR/icon-180.png" "$OUT/apple-touch-icon.png"
cp "$TMPDIR/icon-192.png" "$OUT/android-chrome-192x192.png"
cp "$TMPDIR/icon-512.png" "$OUT/android-chrome-512x512.png"
cp "$TMPDIR/icon-512.png" "$OUT/favicon.png"

echo "  favicon-{16,32,48,96}x*.png"
echo "  apple-touch-icon.png (180x180)"
echo "  android-chrome-{192,512}x*.png"
echo "  mstile-150x150.png"
echo "  favicon.png (512x512)"

# 4. Generate multi-size favicon.ico
magick "$TMPDIR/icon-16.png" "$TMPDIR/icon-32.png" "$TMPDIR/icon-48.png" "$OUT/favicon.ico"
echo "  favicon.ico (16+32+48)"

echo "Done — $(ls "$OUT"/favicon* "$OUT"/android-chrome* "$OUT"/apple-touch* "$OUT"/mstile* 2>/dev/null | wc -l | tr -d ' ') files generated"
