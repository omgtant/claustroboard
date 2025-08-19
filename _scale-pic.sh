# ...existing code...
#!/bin/bash

# Watch web/src/public/atlas-src.png for changes
# Whenever it changes, create a picture web/src/public/atlas.png
# that is a 4x scaled version of the original

set -u -o pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
INPUT_PFX="$ROOT_DIR/web/src/static/assets/img"
INPUT_FILE="${IN:-atlas-src.png}"
INPUT="$INPUT_PFX/$INPUT_FILE"
OUTPUT_PFX="$INPUT_PFX"
OUTPUT_FILE="${OUT:-atlas.png}"
OUTPUT="$OUTPUT_PFX/$OUTPUT_FILE"
SCALE_FACTOR="${SCALE:-4}"
WATCH_DIR="$(dirname "$INPUT")"
BASENAME="$(basename "$INPUT")"

# Pick ImageMagick CLI (v7: magick, v6: convert)
if command -v magick >/dev/null 2>&1; then
  IM_CMD=(magick)
elif command -v convert >/dev/null 2>&1; then
  IM_CMD=(convert)
else
  echo "Error: ImageMagick not found (install 'imagemagick')." >&2
  exit 1
fi

build_once() {
  if [[ ! -f "$INPUT" ]]; then
    echo "Waiting for $INPUT to exist..."
    return 0
  fi
  tmp="${OUTPUT}.tmp.$$"
  # Use point filter to preserve pixel-art crispness
  "${IM_CMD[@]}" "$INPUT" -filter point -resize "$((SCALE_FACTOR*100))%" +repage "$tmp" && mv -f "$tmp" "$OUTPUT"
  echo "Wrote $OUTPUT"
}

trap 'echo "Exiting."; exit 0' INT TERM

# Initial build
build_once

# If inotifywait is missing, just exit after the initial build
if ! command -v inotifywait >/dev/null 2>&1; then
  echo "Tip: install 'inotify-tools' to auto-watch for changes." >&2
  exit 0
fi

echo "Watching $INPUT for changes..."
inotifywait -m -e close_write -e moved_to -e create -e attrib --format '%e %w%f' "$WATCH_DIR" \
| while read -r events path; do
    if [[ "$path" == "$INPUT" ]]; then
      build_once
    fi
  done