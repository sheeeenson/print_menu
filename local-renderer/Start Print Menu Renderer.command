#!/bin/bash
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

HEALTH_URL="http://localhost:3020/health"

pause_before_close() {
  echo ""
  echo "You can close this window when you are done exporting TV Promo videos."
  read -r -p "Press Enter to close this window..."
}

check_health() {
  curl -fsS "$HEALTH_URL" >/dev/null 2>&1
}

clear
printf '\033]0;Print Menu Local Renderer\007'
echo "Print Menu Local Renderer"
echo "========================="
echo ""
echo "Folder: $SCRIPT_DIR"
echo ""
echo "This window must stay open while exporting MP4/WebM from the website."
echo "Renderer URL: http://localhost:3020"
echo ""

if check_health; then
  echo "Renderer is already running and ready."
  echo "Health check: $HEALTH_URL"
  pause_before_close
  exit 0
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install it from https://nodejs.org and run this launcher again."
  pause_before_close
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  if ! npm install; then
    echo ""
    echo "npm install failed. Check the messages above, then run this launcher again."
    pause_before_close
    exit 1
  fi
fi

if [ ! -d "$HOME/Library/Caches/ms-playwright" ] && [ ! -d "node_modules/playwright-core/.local-browsers" ]; then
  echo "Installing Chromium for Playwright..."
  if ! npm run setup; then
    echo ""
    echo "Playwright Chromium install failed. Check the messages above, then run this launcher again."
    pause_before_close
    exit 1
  fi
fi

if [ ! -x "bin/ffmpeg" ] && ! command -v ffmpeg >/dev/null 2>&1; then
  echo "FFmpeg was not found."
  echo "Put the ffmpeg executable into:"
  echo "$SCRIPT_DIR/bin/ffmpeg"
  pause_before_close
  exit 1
fi

echo "Starting renderer..."
echo ""
echo "Status: running"
echo "Health check: $HEALTH_URL"
echo ""
echo "Keep this window open. Closing it will stop MP4/WebM export."
echo ""

npm start
STATUS=$?

echo ""
if [ "$STATUS" -eq 0 ]; then
  echo "Renderer stopped."
else
  echo "Renderer stopped with error code $STATUS. Check the messages above."
fi

pause_before_close
exit "$STATUS"
