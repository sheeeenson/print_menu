#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "Starting Print Menu Local Renderer..."
echo "Folder: $SCRIPT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "Node.js is required. Install it from https://nodejs.org and run this launcher again."
  echo ""
  read -p "Press Enter to close..."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

if [ ! -d "$HOME/Library/Caches/ms-playwright" ] && [ ! -d "node_modules/playwright-core/.local-browsers" ]; then
  echo "Installing Chromium for Playwright..."
  npm run setup
fi

if [ ! -x "bin/ffmpeg" ] && ! command -v ffmpeg >/dev/null 2>&1; then
  echo ""
  echo "FFmpeg was not found."
  echo "Put the ffmpeg executable into:"
  echo "$SCRIPT_DIR/bin/ffmpeg"
  echo ""
  read -p "Press Enter to close..."
  exit 1
fi

echo ""
echo "Renderer will run at http://localhost:3020"
echo "Keep this window open while exporting MP4/WebM from the website."
echo ""

npm start
